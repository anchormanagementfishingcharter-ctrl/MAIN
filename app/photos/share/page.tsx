import PhotoUpload from "../PhotoUpload";

export default function SharePage() {
  return (
    <main className="mx-auto max-w-xl p-4">
      <a href="/" className="font-bold text-teal-800 underline">← Back to reserve your gear</a>
      <h1 className="mt-2 text-3xl font-bold">Share your catch</h1>
      <p className="mb-3 text-sm">Send us a photo from your trip. We review every photo before it appears on the site.</p>
      <PhotoUpload />
      <p className="mt-6 text-center"><a href="/photos" className="font-bold text-teal-800 underline">See customer photos</a></p>
      <p className="mt-2 text-center"><a href="/" className="font-bold text-teal-800 underline">← Back to reserve your gear</a></p>
    </main>
  );
}
