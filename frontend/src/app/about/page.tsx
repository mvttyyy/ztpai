export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">About BeatThatZTPAI</h1>
        <p className="text-muted-foreground">
          BeatThatZTPAI is a modern music/loops sharing platform built with Next.js, NestJS, and Prisma. It allows users to upload, browse, rate, and download audio loops, manage favorites, and interact with the community.
        </p>
      </div>
      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-xl font-semibold mb-2">Features</h2>
        <ul className="list-disc pl-6 mb-4 text-muted-foreground">
          <li>Upload and share audio loops</li>
          <li>Browse, search, and filter loops</li>
          <li>Rate, comment, and favorite loops</li>
          <li>Download loops and view download history</li>
          <li>Profile management and settings</li>
          <li>Admin dashboard for user and loop management</li>
          <li>Real-time notifications and health status</li>
        </ul>
        <h2 className="text-xl font-semibold mb-2">Tech Stack</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Frontend: Next.js, React, TypeScript, Tailwind CSS</li>
          <li>Backend: NestJS, Prisma, PostgreSQL, RabbitMQ</li>
          <li>UI: shadcn/ui, Radix UI, Lucide icons</li>
        </ul>
      </div>
    </div>
  );
}
