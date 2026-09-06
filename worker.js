const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function validData(data) {
  return (
    data &&
    typeof data === "object" &&
    Array.isArray(data.departments) &&
    Array.isArray(data.books)
  );
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ---------- Shared data API ----------
    if (url.pathname === "/api/data" && request.method === "GET") {
      const row = await env.DB
        .prepare("SELECT data FROM site_data WHERE id = 1")
        .first();

      if (!row) {
        return json({
          departments: [],
          books: [],
        });
      }

      return json(JSON.parse(row.data));
    }

    if (url.pathname === "/api/data" && request.method === "PUT") {
      let data;

      try {
        data = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      if (!validData(data)) {
        return json({ error: "Invalid data structure" }, 400);
      }

      await env.DB
        .prepare(`
          INSERT INTO site_data (id, data, updated_at)
          VALUES (1, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            updated_at = CURRENT_TIMESTAMP
        `)
        .bind(JSON.stringify(data))
        .run();

      return json({ success: true });
    }

    if (url.pathname === "/api/data/reset" && request.method === "POST") {
      const data = {
        departments: [],
        books: [],
      };

      await env.DB
        .prepare(`
          INSERT INTO site_data (id, data, updated_at)
          VALUES (1, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            updated_at = CURRENT_TIMESTAMP
        `)
        .bind(JSON.stringify(data))
        .run();

      return json({ success: true, data });
    }

    // ---------- Website ----------
    return env.ASSETS.fetch(request);
  },
};
