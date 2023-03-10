from re import sub, findall
from subprocess import run as subprocess_run


# "// !debug: (Debug-name)", "// !test: (Test-name)" が付いた行を削除して src/tmp にコピー

block_debug_regexp = "\n *// !debug-start: (.*)\n(.*\n)* *// !debug-end: (\\1) *"
line_debug_regexp = "\n *// !debug: (.*)\n.*"
block_test_regexp = "\n *// !test-start: (.*)\n(.*\n)* *// !test-end: (\\1) *"
line_test_regexp = "\n *// !test: (.*)\n.*"

def delete_and_copy(filename):
    with open(f"./src/{filename}.ts", encoding="utf-8") as tsf:
        ts = tsf.read()
    with open(f"./src/tmp/{filename}.ts", "w", encoding="utf-8") as tmpf:
        block_debug_names = findall(block_debug_regexp, ts)
        line_debug_names = findall(line_debug_regexp, ts)
        
        block_test_names = findall(block_test_regexp, ts)
        line_test_names = findall(line_test_regexp, ts)
        
        print(f"{filename}.ts:")
        print(f"    Debug:")
        [print(f"      + {line[0]}") for line in block_debug_names]
        [print(f"      - {line}") for line in line_debug_names]
        print()
        print(f"    Test:")
        [print(f"      + {line[0]}") for line in block_test_names]
        [print(f"      - {line}") for line in line_test_names]
        
        ts = sub(block_debug_regexp, "", ts)
        ts = sub(line_debug_regexp, "", ts)
        ts = sub(block_test_regexp, "", ts)
        ts = sub(line_test_regexp, "", ts)
        tmpf.write(ts)

[(delete_and_copy(filename), print()) for filename in ["main", "lib"]]
print("")


# tsc の実行
# なぜか flush を指定しないと表示されない
print("tsc: ", end="", flush=True)
subprocess_run("tsc", shell=True)
print("end\n")



# import の修正, 改行の削除, 末尾の空白の削除をしてから docs にコピー
# target/tmp -> docs, target -> docs/debug に注意

def fix_and_copy(target_path, docs_path):
    with open(f"./target/{target_path}.js", encoding="utf-8") as jsf:
        js = jsf.read()
    with open(f"./docs/{docs_path}.js", "w", encoding="utf-8") as docsf:
        js = js.replace('from "./lib"', 'from "./lib.js"')
        js = sub("\n *", " ", js)
        if js[-1] == " ":
            js = js[:-1]
        
        docsf.write(js)

[ fix_and_copy(target, docs) for (target, docs) in
    [
        ["tmp/main", "main"],
        ["tmp/lib", "lib"],
        ["main", "debug/main"],
        ["lib", "debug/lib"]
    ]
]
print("Format Complete")
