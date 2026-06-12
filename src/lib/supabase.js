import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

/**
 * Fetches all products from the `products` table.
 * Expected shape per row:
 * {
 *   id, name, price, category, tag, color, gradient,
 *   stock: { XS: number, S: number, M: number, L: number, XL: number }
 * }
 */
export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("fetchProducts error:", error);
    throw error;
  }

  return data || [];
}

/**
 * Subscribes to real-time changes on the `products` table.
 * Whenever a row is inserted, updated, or deleted, re-fetches the full
 * product list and invokes the callback with the fresh array.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToProducts(callback) {
  const channel = supabase
    .channel("products-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      async () => {
        try {
          const fresh = await fetchProducts();
          callback(fresh);
        } catch (err) {
          console.error("subscribeToProducts refresh error:", err);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

/**
 * Places an order via a Supabase RPC function (`place_order`), which is
 * expected to validate stock atomically and throw if any item is no longer
 * available.
 *
 * @param {Object} order
 * @param {Array<{productId: number, name: string, size: string, qty: number, price: number}>} order.items
 * @param {{name: string, email: string, address: string}} order.customer
 * @param {{card: string, expiry: string, cvv: string}} order.payment
 * @param {number} order.subtotal
 * @param {number} order.shipping
 * @param {number} order.total
 */
export async function placeOrder(order) {
  const { data, error } = await supabase.rpc("place_order", {
    items: order.items,
    customer: order.customer,
    payment: order.payment,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
  });

  if (error) {
    // Surface a normalized "OUT_OF_STOCK" error for the UI to catch
    if (
      error.message?.toUpperCase().includes("OUT_OF_STOCK") ||
      error.code === "OUT_OF_STOCK"
    ) {
      const outOfStockError = new Error("OUT_OF_STOCK");
      outOfStockError.code = "OUT_OF_STOCK";
      throw outOfStockError;
    }

    console.error("placeOrder error:", error);
    throw error;
  }

  return data;
}

/**
 * Fetches recent orders from the `orders` table, most recent first.
 * Expected shape per row:
 * {
 *   id, created_at, customer: { name, email, address },
 *   items: [{ productId, name, size, qty, price }],
 *   subtotal, shipping, total
 * }
 */
export async function fetchOrders(limit = 50) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchOrders error:", error);
    throw error;
  }

  return data || [];
}

// ─── ADMIN AUTH ──────────────────────────────────────────────────────────────

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

/**
 * Signs in the store owner with email + password via Supabase Auth.
 * Throws if the authenticated email doesn't match VITE_ADMIN_EMAIL.
 */
export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("signInAdmin error:", error);
    throw error;
  }

  const signedInEmail = data?.user?.email?.toLowerCase();
  if (!ADMIN_EMAIL || signedInEmail !== ADMIN_EMAIL.toLowerCase()) {
    await supabase.auth.signOut();
    const unauthorizedError = new Error("UNAUTHORIZED");
    unauthorizedError.code = "UNAUTHORIZED";
    throw unauthorizedError;
  }

  return data;
}

/**
 * Signs the current admin user out.
 */
export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("signOutAdmin error:", error);
    throw error;
  }
}

/**
 * Returns the current session if it belongs to the configured admin email,
 * otherwise returns null.
 */
export async function getAdminSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("getAdminSession error:", error);
    return null;
  }

  const session = data?.session;
  const sessionEmail = session?.user?.email?.toLowerCase();

  if (!session || !ADMIN_EMAIL || sessionEmail !== ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  return session;
}

/**
 * Subscribes to Supabase auth state changes (sign in / sign out).
 * Returns an unsubscribe function.
 */
export function onAdminAuthStateChange(callback) {
  const { data: listener } = supabase.auth.onAuthStateChange(async () => {
    const session = await getAdminSession();
    callback(session);
  });

  return () => {
    listener?.subscription?.unsubscribe();
  };
}

// ─── ADMIN PRODUCT MANAGEMENT ─────────────────────────────────────────────────

/**
 * Uploads a product image file to the `product-images` storage bucket and
 * returns its public URL.
 */
export async function uploadProductImage(file) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    console.error("uploadProductImage error:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
  return data?.publicUrl;
}

/**
 * Inserts a new product into the `products` table.
 * @param {Object} product
 * @param {string} product.name
 * @param {string} product.description
 * @param {number} product.price
 * @param {string} product.category
 * @param {string} product.tag
 * @param {string} product.imageUrl
 * @param {{XS?: number, S: number, M: number, L: number, XL: number}} product.stock
 */
export async function addProduct(product) {
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        tag: product.tag,
        image_url: product.imageUrl,
        stock: product.stock,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("addProduct error:", error);
    throw error;
  }

  return data;
}

/**
 * Updates the stock object for an existing product.
 */
export async function updateProductStock(productId, stock) {
  const { data, error } = await supabase
    .from("products")
    .update({ stock })
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    console.error("updateProductStock error:", error);
    throw error;
  }

  return data;
}