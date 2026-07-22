import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { remarkMdDiscordSyntax } from "@edems-dev/remark-discord-syntax";

async function getRenderedContent() {
  const contentPath = path.resolve(process.cwd(), "..", "content", "test.md");
  const fileContent = fs.existsSync(contentPath)
    ? fs.readFileSync(contentPath, "utf-8")
    : "# Error\nCould not locate `examples/content/test.md`.";

  const processed = await remark()
    .use(remarkMdDiscordSyntax)
    .use(remarkHtml, { sanitize: false })
    .process(fileContent);

  let html = processed.toString();

  // Clean up any legacy <Spoiler> tags if present without introducing extra line breaks
  html = html.replace(
    /\n?<Spoiler>\n?/g,
    '<span class="discord-syntax-spoiler" data-spoiler="true" onclick="this.classList.toggle(\'revealed\')">',
  );
  html = html.replace(/\n?<\/Spoiler>\n?/g, "</span>");

  return html;
}

export default async function HomePage() {
  const htmlContent = await getRenderedContent();

  return (
    <div>
      <header
        style={{
          marginBottom: "2rem",
          borderBottom: "1px solid #3f4147",
          paddingBottom: "1rem",
        }}
      >
        <h1>Next.js Remark Discord Syntax Test</h1>
        <p style={{ color: "#949ba4" }}>
          Rendering shared <code>examples/content/test.md</code> using{" "}
          <code>@edems-dev/remark-discord-syntax</code>.
        </p>
      </header>
      <article dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
}
