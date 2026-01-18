import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const STORAGE_BUCKET = "recipe-images";

export async function POST(request: Request) {
  const client = getSupabaseServerClient();

  if (!client) {
    return NextResponse.json(
      {
        error:
          'Supabase ist nicht konfiguriert (Bitte env-Variablen prüfen: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_ANON_KEY)',
      },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const itemId =
      typeof formData.get("itemId") === "string"
        ? (formData.get("itemId") as string)
        : null;

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Es wurde keine Bilddatei hochgeladen." },
        { status: 400 }
      );
    }

    const originalName =
      typeof formData.get("filename") === "string"
        ? (formData.get("filename") as string)
        : "upload";

    const extensionFromName = originalName.includes(".")
      ? originalName.split(".").pop() ?? ""
      : "";

    const safeExtension =
      extensionFromName ||
      (file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
        ? "png"
        : "bin");

    const objectPath = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${safeExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const uploadResult = await client.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadResult.error) {
      const message = uploadResult.error.message ?? "";
      const status = (uploadResult as { statusCode?: number | string }).statusCode;
      const bucketNotFound =
        (typeof status === "number" && status === 404) ||
        (typeof status === "string" && status === "404") ||
        message.toLowerCase().includes("bucket") ||
        message.toLowerCase().includes("not found");

      if (bucketNotFound) {
        return NextResponse.json(
          {
            error:
              'Admin-Aktion erforderlich: Storage-Bucket "recipe-images" existiert nicht. Bitte in Supabase im Bereich "Storage" einen öffentlichen Bucket mit dem Namen "recipe-images" anlegen.',
            code: "BUCKET_NOT_FOUND",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: `Fehler beim Upload in Supabase Storage: ${message}`,
        },
        { status: 500 }
      );
    }

    const publicUrlResult = client.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(objectPath);

    const publicUrl = publicUrlResult.data.publicUrl;

    if (itemId && itemId.trim().length > 0) {
      const updateResponse = await client
        .from("items")
        .update({ image_url: publicUrl })
        .eq("id", itemId)
        .select("id")
        .single();

      if (updateResponse.error) {
        return NextResponse.json(
          {
            error:
              updateResponse.error.message ??
              'Fehler beim Speichern des Bild-Links in Tabelle "items"',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ imageUrl: publicUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      {
        error: `Unerwarteter Fehler beim Bild-Upload: ${message}`,
      },
      { status: 500 }
    );
  }
}
