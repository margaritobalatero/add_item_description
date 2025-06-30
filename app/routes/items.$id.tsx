import { useLoaderData, Form, useActionData } from "@remix-run/react";
import type { LoaderArgs, ActionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { getDb } from "~/utils/db.server";
import { ObjectId } from "mongodb";
import { itemSchema } from "~/utils/schema";
import { z } from "zod";

type LoaderData = {
  id: string;
  name: string;
  description: string;
};

type ActionData = {
  error?: string;
};

export async function loader({ params }: LoaderArgs) {
  const db = await getDb();
  const item = await db.collection("items").findOne({ _id: new ObjectId(params.id) });
  if (!item) throw new Response("Not Found", { status: 404 });

  const data: LoaderData = {
    id: item._id.toString(),
    name: item.name,
    description: item.description || "",
  };

  return json(data);
}

export async function action({ request, params }: ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = params.id;
  const db = await getDb();

  if (!id) {
    return json<ActionData>({ error: "Invalid item ID" }, { status: 400 });
  }

  if (intent === "delete") {
    await db.collection("items").deleteOne({ _id: new ObjectId(id) });
    return redirect("/");
  }

  // Update item
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

  await db.collection("items").updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, description } }
  );

  return redirect("/");
}

export default function EditItem() {
  const item = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();

  return (
    <div style={{ padding: 20 }}>
      <h1>Edit Item</h1>

      {actionData?.error && (
        <p style={{ color: "red" }}>{actionData.error}</p>
      )}

      <Form method="post">
        <div>
          <label>
            Name:{" "}
            <input type="text" name="name" defaultValue={item.name} required />
          </label>
        </div>
        <div style={{ marginTop: 10 }}>
          <label>
            Description:{" "}
            <input
              type="text"
              name="description"
              defaultValue={item.description}
              placeholder="Optional description"
            />
          </label>
        </div>
        <div style={{ marginTop: 20 }}>
          <button type="submit" name="intent" value="update">
            Update
          </button>
          <button
            type="submit"
            name="intent"
            value="delete"
            style={{ marginLeft: 10, color: "red" }}
          >
            Delete
          </button>
        </div>
      </Form>

      <p style={{ marginTop: 20 }}>
        <a href="/">Back to list</a>
      </p>
    </div>
  );
}
