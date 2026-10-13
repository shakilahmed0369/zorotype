/**
 * Source snippets for the code practice mode, bundled so a test never waits on the network.
 * A snippet is stored verbatim: `setupNewTest(..., { raw: true })` keeps it exactly as written, and
 * the registry test enforces the rules the renderer relies on — spaces for indentation in twos,
 * lines under 64 characters, ASCII only, no tabs, no trailing whitespace, no trailing newline.
 */
export interface CodeLanguageDef {
  id: string;
  name: string;
  /** Compact label for tight places — the test-config bar shows this, Settings shows `name`. */
  short: string;
  snippets: readonly string[];
}

export const DEFAULT_CODE_LANGUAGE = "javascript";

export const CODE_LANGUAGES: readonly CodeLanguageDef[] = [
  {
    id: "javascript",
    name: "JavaScript",
    short: "js",
    snippets: [
      `async function loadProfile(id) {
  const res = await fetch('/api/profile/' + id);
  if (!res.ok) throw new Error('profile ' + id);
  return res.json();
}`,
      `const totals = orders.reduce((acc, order) => {
  const key = order.region;
  acc[key] = (acc[key] || 0) + order.amount;
  return acc;
}, {});`,
      `function onKeyDown(event) {
  if (event.key === 'Escape') {
    closePanel();
    return;
  }
  setQuery(event.target.value.trim());
}`,
    ],
  },
  {
    id: "typescript",
    name: "TypeScript",
    short: "ts",
    snippets: [
      `interface Playlist {
  id: string;
  tracks: string[];
}

function idsOf(list: Playlist[]): string[] {
  return list.map(item => item.id);
}`,
      `function first<T>(items: T[]): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[0];
}`,
      `function area(shape: Shape): number {
  if (shape.kind === 'circle') {
    return Math.PI * shape.r * shape.r;
  }
  return shape.side * shape.side;
}`,
    ],
  },
  {
    id: "python",
    name: "Python",
    short: "py",
    snippets: [
      `from collections import Counter

def top_words(text, limit=3):
    counts = Counter(text.lower().split())
    return [word for word, n in counts.most_common(limit)]`,
      `@dataclass
class Point:
    x: float
    y: float

    def length(self) -> float:
        return (self.x ** 2 + self.y ** 2) ** 0.5`,
      `def read_config(path):
    try:
        with open(path) as handle:
            return json.load(handle)
    except OSError:
        return {}`,
    ],
  },
  {
    id: "rust",
    name: "Rust",
    short: "rs",
    snippets: [
      `fn double_sum(rows: &[i64]) -> i64 {
    rows.iter()
        .filter(|n| **n > 0)
        .map(|n| n * 2)
        .sum()
}`,
      `fn read_len(path: &str) -> Result<usize, io::Error> {
    let text = fs::read_to_string(path)?;
    Ok(text.trim().len())
}`,
      `fn describe(state: State) -> &'static str {
    match state {
        State::Idle => "waiting",
        State::Busy(n) if n > 3 => "overloaded",
        State::Busy(_) => "busy",
    }
}`,
    ],
  },
  {
    id: "go",
    name: "Go",
    short: "go",
    snippets: [
      `type Counter struct {
  Total int
}

func (c *Counter) Add(n int) {
  c.Total += n
}`,
      `data, err := os.ReadFile(path)
if err != nil {
  return fmt.Errorf("read config: %w", err)
}
return parse(data)`,
      `jobs := make(chan int, 4)
done := make(chan bool)

go func() {
  for n := range jobs {
    process(n)
  }
  done <- true
}()`,
    ],
  },
  {
    id: "java",
    name: "Java",
    short: "java",
    snippets: [
      `record User(String name, int score) {}

List<String> best = users.stream()
    .filter(u -> u.score() > 80)
    .map(User::name)
    .sorted()
    .toList();`,
      `try (BufferedReader reader = new BufferedReader(file)) {
  String line;
  while ((line = reader.readLine()) != null) {
    lines.add(line.strip());
  }
}`,
      `List<Task> queue = new ArrayList<>(tasks);
queue.sort((a, b) -> Integer.compare(a.due(), b.due()));
queue.removeIf(task -> task.done());
return queue;`,
    ],
  },
  {
    id: "csharp",
    name: "C#",
    short: "cs",
    snippets: [
      `var report = orders
    .Where(o => o.Total > 100)
    .GroupBy(o => o.Region)
    .Select(g => new { Region = g.Key, Count = g.Count() });`,
      `public async Task<string> LoadAsync(string path)
{
    using var stream = File.OpenRead(path);
    using var reader = new StreamReader(stream);
    return await reader.ReadToEndAsync();
}`,
      `string Name(Status status) => status switch
{
    Status.Open => "open",
    Status.Closed => "closed",
    _ => "unknown",
};`,
    ],
  },
  {
    id: "cpp",
    name: "C++",
    short: "c++",
    snippets: [
      `std::vector<int> values = {4, 8, 1, 9};
std::sort(values.begin(), values.end(),
    [](int a, int b) { return a > b; });

for (int v : values) {
  std::cout << v << " ";
}`,
      `std::map<std::string, int> counts;
for (const auto& word : words) {
  counts[word] += 1;
}
auto hit = counts.find("the");
return hit == counts.end() ? 0 : hit->second;`,
      `class Timer {
public:
  Timer() : start_(clock::now()) {}
  ~Timer() {
    log(clock::now() - start_);
  }
private:
  clock::time_point start_;
};`,
    ],
  },
];

export function codeLanguage(id: string): CodeLanguageDef | undefined {
  return CODE_LANGUAGES.find((lang) => lang.id === id);
}

/** A random snippet from a language, falling back to the default language for an unknown id. */
export function pickSnippet(id: string, random: () => number = Math.random): string {
  const lang = codeLanguage(id) ?? codeLanguage(DEFAULT_CODE_LANGUAGE);
  if (!lang || lang.snippets.length === 0) return "";
  const index = Math.min(lang.snippets.length - 1, Math.floor(random() * lang.snippets.length));
  return lang.snippets[index];
}

/**
 * What pressing Enter inserts: the line break plus the indentation of the line the cursor lands on,
 * read back out of the sample so the engine never has to track where lines begin. Pressing Enter
 * mid-line takes the indent of the sample's next line, and the insertion can never overrun the
 * sample, because both the newline and the indent it copies come from the sample itself.
 */
export function autoIndentAfter(sample: string, index: number): string {
  const nextNewline = sample.indexOf("\n", index);
  if (nextNewline < 0) return "";
  const indent = /^ */.exec(sample.slice(nextNewline + 1))?.[0] ?? "";
  return "\n" + indent;
}
