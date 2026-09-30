/**
 * The Workbench's language catalog — ONE picker holds everything.
 * Every judge0 id is verified compile+run on ce.judge0.com (2026-09-30),
 * matching the original Vue implementation's version picks. The web
 * playground entry (HTML + CSS + JS) is pinned first in the picker.
 */
export interface WorkbenchLanguage {
  id: string
  label: string
  monaco: string
  filename: string
  sample: string
}

export const WORKBENCH_LANGUAGES: WorkbenchLanguage[] = [
  {
    id: 'javascript',
    label: 'JavaScript',
    monaco: 'javascript',
    filename: 'main.js',
    sample: '// JavaScript on Node.js — output and input happen in the terminal.\nconst name = "Devora";\nconsole.log("Hello, " + name);\n'
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    monaco: 'typescript',
    filename: 'main.ts',
    sample: 'const greet = (name: string): string => `Hello, ${name}`;\nconsole.log(greet("Devora"));\n'
  },
  {
    id: 'python',
    label: 'Python',
    monaco: 'python',
    filename: 'main.py',
    sample: '# Python — run it, then type input on the prompt line when it asks.\nname = input("What is your name? ")\nprint(f"Hello, {name}")\n'
  },
  {
    id: 'java',
    label: 'Java',
    monaco: 'java',
    filename: 'Main.java',
    sample: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        System.out.print("What is your name? ");\n        String name = scanner.nextLine();\n        System.out.println("Hello, " + name);\n    }\n}\n'
  },
  {
    id: 'c',
    label: 'C',
    monaco: 'c',
    filename: 'main.c',
    sample: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, Devora!\\n");\n    return 0;\n}\n'
  },
  {
    id: 'cpp',
    label: 'C++',
    monaco: 'cpp',
    filename: 'main.cpp',
    sample: '#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    std::cout << "What is your name? ";\n    std::getline(std::cin, name);\n    std::cout << "Hello, " << name << std::endl;\n    return 0;\n}\n'
  },
  {
    id: 'csharp',
    label: 'C#',
    monaco: 'csharp',
    filename: 'Hello.cs',
    sample: 'using System;\n\nclass Hello {\n    static void Main() {\n        Console.WriteLine("Hello, Devora!");\n    }\n}\n'
  },
  {
    id: 'go',
    label: 'Go',
    monaco: 'go',
    filename: 'main.go',
    sample: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Devora!")\n}\n'
  },
  {
    id: 'rust',
    label: 'Rust',
    monaco: 'rust',
    filename: 'main.rs',
    sample: 'fn main() {\n    println!("Hello from Rust!");\n}\n'
  },
  {
    id: 'ruby',
    label: 'Ruby',
    monaco: 'ruby',
    filename: 'main.rb',
    sample: 'puts "Hello, Devora!"\n'
  },
  {
    id: 'php',
    label: 'PHP',
    monaco: 'php',
    filename: 'index.php',
    sample: '<?php\n$name = "Devora";\necho "Hello, " . $name . "!\\n";\n'
  },
  {
    id: 'kotlin',
    label: 'Kotlin',
    monaco: 'kotlin',
    filename: 'Main.kt',
    sample: 'fun main() {\n    println("Hello from Kotlin!")\n}\n'
  },
  {
    id: 'swift',
    label: 'Swift',
    monaco: 'swift',
    filename: 'main.swift',
    sample: 'print("Hello from Swift!")\n'
  },
  {
    id: 'bash',
    label: 'Bash',
    monaco: 'shell',
    filename: 'main.sh',
    sample: 'echo "Hello from Bash!"\nfor i in 1 2 3 4 5; do\n  echo "Count: $i"\ndone\n'
  },
  {
    id: 'sql',
    label: 'SQL (SQLite)',
    monaco: 'sql',
    filename: 'main.sql',
    sample: 'CREATE TABLE users (id INTEGER, name TEXT);\nINSERT INTO users VALUES (1, \'Ada\'), (2, \'Grace\');\nSELECT * FROM users;\n'
  },
  {
    id: 'r',
    label: 'R',
    monaco: 'r',
    filename: 'main.r',
    sample: 'name <- "Devora"\ncat("Hello,", name, "!\\n")\n'
  }
]

export const WEB_PLAYGROUND_ID = 'web-playground'

export function getWorkbenchLanguage(id: string): WorkbenchLanguage | null {
  return WORKBENCH_LANGUAGES.find((l) => l.id === id) ?? null
}
