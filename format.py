from re import sub

with open("./target/main.js", encoding="utf8") as main_inpf:
    maint = main_inpf.read()

with open("./docs/main.js", "w", encoding="utf8") as main_outf:
    main_outf.write( sub("\n *", " ", maint) )


with open("./target/lib.js", encoding="utf8") as lib_inpf:
    libt = lib_inpf.read()

with open("./docs/lib.js", "w", encoding="utf8") as lib_outf:
    lib_outf.write( sub("\n *", " ", libt) )
