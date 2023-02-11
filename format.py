from re import sub, findall
from subprocess import run as subprocess_run


# "// !debug: (Debug-Name)" が付いた行を削除して src/tmp にコピー

debug_regexp = "\n.*// !debug: (.*)"

def delete_debug_and_copy(filename):
    with open(f"./src/{filename}.ts", encoding="utf-8") as tsf:
        ts = tsf.read()
    with open(f"./src/tmp/{filename}.ts", "w", encoding="utf-8") as tmpf:
        delete_lines = findall(debug_regexp, ts)
        print(f"{filename}: find {len(delete_lines)} lines ... {delete_lines}")
        
        tmpf.write(
            sub(debug_regexp, "", ts)
        )

print("debug lines:")
[[print("    ", end=""), delete_debug_and_copy(filename)] for filename in ["main", "lib"]]
print("")


# tsc の実行
# なぜか flush を指定しないと表示されない
print("tsc: ", end="", flush=True)
subprocess_run("tsc", shell=True)
print("end")



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
