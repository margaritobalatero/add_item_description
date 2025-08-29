import { useLoaderData, Form, useActionData, useSearchParams } from "@remix-run/react";
import type { LoaderArgs, ActionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { getDb } from "~/utils/db.server";
import { itemSchema } from "~/utils/schema";
import { ObjectId } from "mongodb";
import { z } from "zod";

type Item = {
  id: string;
  name: string;
  description: string;
};

type LoaderData = {
  items: Item[];
  search: string;
};

type ActionData = {
  error?: string;
};

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("q") || "";

  const db = await getDb();
  const query = search
    ? { name: { $regex: search, $options: "i" } }
    : {};

  const items = await db.collection("items").find(query).toArray();

  const data: LoaderData = {
    items: items.map(({ _id, name, description }) => ({
      id: _id.toString(),
      name,
      description: description || "",
    })),
    search,
  };

  return json(data);
}

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  const db = await getDb();

  if (intent === "delete") {
    const id = formData.get("id");
    if (typeof id === "string") {
      await db.collection("items").deleteOne({ _id: new ObjectId(id) });
    }
    return redirect("/");
  }

  // Create new item
  const name = formData.get("name");
  const description = formData.get("description");

  if (typeof name !== "string" || (description !== null && typeof description !== "string")) {
    return json<ActionData>({ error: "Invalid form data" }, { status: 400 });
  }

  try {
    itemSchema.parse({ name, description });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return json<ActionData>({ error: e.errors[0].message }, { status: 400 });
    }
    throw e;
  }

  await db.collection("items").insertOne({ name, description });

  return redirect("/");
}

export default function Index() {
  const { items, search } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();

  return (
    <div style={{ padding: 20 }}>
      <center><h1>Junjie Notes</h1>
      <br></br>
      <Form method="get" style={{ marginBottom: 20 }}>
        <input
          type="search"
          name="q"
          placeholder="Search items"
          defaultValue={search}
        />
        <button type="submit">Search</button>
      </Form>
      </center>

      {actionData?.error && (
        <p style={{ color: "red" }}>{actionData.error}</p>
      )}

      <ul>
        {items.map((item) => (
          <li key={item.id} style={{ marginBottom: 8 }}>
            <strong>{item.name}</strong>: {item.description} -{" "}
            <a href={`/items/${item.id}`}>Edit</a>
            <Form method="post" style={{ display: "inline", marginLeft: 10 }}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" name="intent" value="delete" style={{ color: "red" }}>
                Delete
              </button>
            </Form>
          </li>
        ))}
      </ul>
      <br></br>
      <h2>Add New Notes</h2>
      <Form method="post" style={{ marginTop: 20 }}>
        <input type="text" name="name" placeholder="Item name" required />
        <input
          type="text"
          name="description"
          placeholder="Description (optional)"
          style={{ marginLeft: 10 }}
        />
        <button type="submit" style={{ marginLeft: 10 }}>
          Send
        </button>
      </Form>
    </div>
  );
}
