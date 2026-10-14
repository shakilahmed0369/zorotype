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
      `class Cart {
  constructor() {
    this.items = [];
  }

  total() {
    return this.items.reduce((sum, it) => sum + it.price, 0);
  }
}`,
      `const active = users
  .filter(user => user.active)
  .map(user => user.email)
  .sort();

for (const email of active) {
  send(email);
}`,
      `function parse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('bad payload', err.message);
    return {};
  }
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
      `type Role = 'admin' | 'editor' | 'viewer';

const ROLES: Role[] = ['admin', 'editor', 'viewer'];

function canEdit(role: Role): boolean {
  return role !== 'viewer';
}`,
      `class Cache<T> {
  private store = new Map<string, T>();

  set(key: string, value: T): void {
    this.store.set(key, value);
  }
}`,
      `async function loadAll(ids: string[]): Promise<User[]> {
  const rows = await Promise.all(ids.map(id => fetchUser(id)));
  return rows.filter((row): row is User => row !== null);
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
      `def chunk(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]

for block in chunk(data, 3):
    print(block)`,
      `class Basket:
    def __init__(self, items=None):
        self.items = list(items or [])

    def add(self, item):
        self.items.append(item)
        return self`,
      `def summary(rows):
    lines = []
    for name, score in rows:
        lines.append(f"{name}: {score:>4}")
    return ", ".join(lines)`,
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
      `struct Rect {
    width: u32,
    height: u32,
}

impl Rect {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}`,
      `fn greet(name: Option<&str>) -> String {
    match name {
        Some(n) => format!("hello {}", n),
        None => String::from("hello there"),
    }
}`,
      `fn counts(words: &[&str]) -> HashMap<&str, usize> {
    let mut map = HashMap::new();
    for word in words {
        *map.entry(word).or_insert(0) += 1;
    }
    map
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
      `func Sum(values []int) int {
  total := 0
  for _, v := range values {
    total += v
  }
  return total
}`,
      `type Config struct {
  Host string
  Port int
}

func (c Config) Addr() string {
  return fmt.Sprintf("%s:%d", c.Host, c.Port)
}`,
      `counts := map[string]int{}
for _, word := range words {
  counts[word]++
}

if n, ok := counts["go"]; ok {
  fmt.Println(n)
}`,
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
      `public class Account {
    private int balance;

    public void deposit(int amount) {
        balance += amount;
    }
}`,
      `List<String> labels = new ArrayList<>();
for (Task task : tasks) {
    if (task.done()) {
        labels.add(task.title());
    }
}
return labels;`,
      `Map<String, Integer> totals = new HashMap<>();
for (Item item : items) {
    totals.merge(item.key(), item.qty(), Integer::sum);
}
return totals;`,
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
      `public class Order
{
    public string Code { get; init; } = "";
    public decimal Total { get; set; }
}`,
      `var counts = new Dictionary<string, int>();
foreach (var word in words)
{
    counts.TryGetValue(word, out var n);
    counts[word] = n + 1;
}`,
      `foreach (var id in ids)
{
    var user = await client.GetAsync(id);
    if (user is null)
    {
        continue;
    }
    results.Add(user);
}`,
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
      `std::vector<int> evens(const std::vector<int>& input) {
  std::vector<int> out;
  for (int value : input) {
    if (value % 2 == 0) {
      out.push_back(value);
    }
  }
  return out;
}`,
      `struct Point {
  double x = 0;
  double y = 0;

  double dot(const Point& other) const {
    return x * other.x + y * other.y;
  }
};`,
      `std::unordered_map<std::string, int> index;
for (std::size_t i = 0; i < words.size(); ++i) {
  index[words[i]] = static_cast<int>(i);
}
return index;`,
    ],
  },
];

export function codeLanguage(id: string): CodeLanguageDef | undefined {
  return CODE_LANGUAGES.find((lang) => lang.id === id);
}

/**
 * A random snippet from a language, falling back to the default language for an unknown id. Pass the
 * snippet currently in use as `exclude` so a new test never repeats what is already on screen.
 */
export function pickSnippet(
  id: string,
  exclude: string | null = null,
  random: () => number = Math.random
): string {
  const lang = codeLanguage(id) ?? codeLanguage(DEFAULT_CODE_LANGUAGE);
  if (!lang || lang.snippets.length === 0) return "";
  const fresh = lang.snippets.filter((snippet) => snippet !== exclude);
  const pool = fresh.length > 0 ? fresh : lang.snippets;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
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
