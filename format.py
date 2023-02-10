from re import sub

with open("./target/run.js", encoding="utf8") as run_inpf:
    runt = run_inpf.read()

with open("./docs/run.js", "w", encoding="utf8") as run_outf:
    run_outf.write( sub("\n *", " ", runt)[:-1] )


with open("./target/main.js", encoding="utf8") as main_inpf:
    maint = main_inpf.read()

with open("./docs/main.js", "w", encoding="utf8") as main_outf:
    main_outf.write( sub("\n *", " ", maint)[:-1] )


with open("./target/lib.js", encoding="utf8") as lib_inpf:
    libt = lib_inpf.read()

with open("./docs/lib.js", "w", encoding="utf8") as lib_outf:
    lib_outf.write( sub("\n *", " ", libt)[:-1] )
