interface ParagraphBlock {
  kind: "p";
  text: string;
}

interface ListBlock {
  kind: "ul";
  items: string[];
}

export type ChatBlock = ParagraphBlock | ListBlock;

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;

export function parseChatBlocks(content: string): ChatBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ChatBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;

  function flushParagraph() {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (text) blocks.push({ kind: "p", text });
  }

  function flushList() {
    if (list?.length) blocks.push({ kind: "ul", items: list });
    list = null;
  }

  for (const line of lines) {
    const bullet = line.match(BULLET);
    if (bullet) {
      flushParagraph();
      if (!list) list = [];
      list.push(bullet[1].trim());
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function ChatBody({ content }: { content: string }) {
  const blocks = parseChatBlocks(content);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, index) =>
        block.kind === "p" ? (
          <p key={index}>{block.text}</p>
        ) : (
          <ul key={index} className="space-y-1.5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2.5">
                <span
                  className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-accent"
                  aria-hidden
                />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
