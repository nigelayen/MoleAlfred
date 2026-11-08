import plistlib, uuid, zipfile, os, sys
src = sys.argv[1]; dest = sys.argv[2]
U = lambda: str(uuid.uuid4()).upper()
sf, cond, term, reveal, openf = U(), U(), U(), U(), U()
c_reveal, c_open = U(), U()
objs = [
 {"type": "alfred.workflow.input.scriptfilter", "uid": sf, "version": 3, "config": {
   "alfredfiltersresults": False, "argumenttype": 1, "escaping": 102, "keyword": "mo",
   "queuedelaycustom": 3, "queuedelayimmediatelyinitially": True, "queuedelaymode": 0, "queuemode": 1,
   "runningsubtext": "Asking Mole…", "script": './mole.js "$1"', "scriptargtype": 1, "scriptfile": "",
   "subtext": "Clean, uninstall, analyze and monitor your Mac", "title": "Mole", "type": 0, "withspace": True}},
 {"type": "alfred.workflow.utility.conditional", "uid": cond, "version": 1, "config": {
   "conditions": [
     {"inputstring": "{var:mode}", "matchcasesensitive": False, "matchmode": 0, "matchstring": "reveal", "outputlabel": "reveal", "uid": c_reveal},
     {"inputstring": "{var:mode}", "matchcasesensitive": False, "matchmode": 0, "matchstring": "open", "outputlabel": "open", "uid": c_open}],
   "elselabel": "terminal", "hideelse": False}},
 {"type": "alfred.workflow.action.terminalcommand", "uid": term, "version": 1, "config": {"escaping": 0, "script": "{query}"}},
 {"type": "alfred.workflow.action.revealfile", "uid": reveal, "version": 1, "config": {"path": ""}},
 {"type": "alfred.workflow.action.openfile", "uid": openf, "version": 3, "config": {"openwith": "", "sourcefile": ""}},
]
link = lambda dst, out=None: dict({"destinationuid": dst, "modifiers": 0, "modifiersubtext": "", "vitoclose": False}, **({"sourceoutputuid": out} if out else {}))
plist = {
 "bundleid": "fit.mole.alfred", "category": "Tools", "createdby": "", "name": "Mole",
 "description": "Alfred front-end for Mole (mo): clean, uninstall, optimize, analyze, status",
 "webaddress": "https://github.com/tw93/Mole", "version": "1.0.0", "readme": open(os.path.join(src, "README.md")).read(),
 "objects": objs,
 "connections": {sf: [link(cond)], cond: [link(reveal, c_reveal), link(openf, c_open), link(term)]},
 "uidata": {sf: {"xpos": 40, "ypos": 160}, cond: {"xpos": 260, "ypos": 180}, term: {"xpos": 420, "ypos": 300},
            reveal: {"xpos": 420, "ypos": 40}, openf: {"xpos": 420, "ypos": 170}},
 "userconfigurationconfig": [{"type": "textfield", "variable": "mo_path", "label": "mo path",
   "description": "Leave blank to auto-detect (/opt/homebrew/bin/mo or /usr/local/bin/mo)",
   "config": {"default": "", "placeholder": "/opt/homebrew/bin/mo", "required": False, "trim": True}}],
 "variablesdontexport": [],
}
with open(os.path.join(src, "info.plist"), "wb") as f: plistlib.dump(plist, f)
with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
    for n in ["info.plist", "mole.js", "icon.png"]:
        zi = zipfile.ZipInfo.from_file(os.path.join(src, n), n)
        if n == "mole.js": zi.external_attr = 0o100755 << 16
        z.writestr(zi, open(os.path.join(src, n), "rb").read(), zipfile.ZIP_DEFLATED)
