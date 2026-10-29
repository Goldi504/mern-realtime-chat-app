
import "dotenv/config";
import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function testImageKit() {
  try {
    console.log("Checking ImageKit configuration:", {
      publicKeyPresent: Boolean(process.env.IMAGEKIT_PUBLIC_KEY),
      privateKeyPresent: Boolean(process.env.IMAGEKIT_PRIVATE_KEY),
      endpointPresent: Boolean(process.env.IMAGEKIT_URL_ENDPOINT),
    });

    const result = await imagekit.upload({
      file: Buffer.from("ImageKit connection test"),
      fileName: `test-${Date.now()}.txt`,
      folder: "/chat-app",
      useUniqueFileName: true,
    });

    console.log("Upload successful!");
    console.log("File URL:", result.url);
    console.log("File ID:", result.fileId);
  } catch (error) {
    console.error("ImageKit test failed:", error);
    console.error("Error properties:", Object.getOwnPropertyNames(error));

    if (error.$ResponseMetadata) {
      console.error("HTTP status:", error.$ResponseMetadata.statusCode);
      console.error(
        "ImageKit request ID:",
        error.$ResponseMetadata.headers?.["x-ik-requestid"]
      );
    }
  }
}

testImageKit();
