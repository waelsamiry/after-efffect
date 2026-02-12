(function(thisObj) {
    function buildWhisperUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Whisper Master PRO", undefined, {resizeable: true});

        win.orientation = "column";
        win.alignChildren = ["fill", "fill"];
        win.spacing = 10;
        win.margins = 15;

        // --- 1. Controls ---
        var ctrlPnl = win.add("panel", undefined, "Controls");
        ctrlPnl.orientation = "row";
        ctrlPnl.alignment = ["fill", "top"];
        var btnSetup = ctrlPnl.add("button", undefined, "Setup Render");
        var btnLoad = ctrlPnl.add("button", undefined, "Load JSON");

        // --- 2. Font Zoom ---
        var zoomGrp = win.add("group");
        zoomGrp.alignment = ["fill", "top"];
        zoomGrp.add("statictext", undefined, "Text Zoom:");
        var zoomSlider = zoomGrp.add("slider", undefined, 20, 15, 80);
        var zoomVal = zoomGrp.add("statictext", undefined, "20px");

        // --- 3. The Editor Container ---
        var headerGrp = win.add("group");
        headerGrp.orientation = "row";
        headerGrp.alignment = ["fill", "top"];
        headerGrp.spacing = 5;
        var h1 = headerGrp.add("statictext", [0,0,80,20], "From");
        var h2 = headerGrp.add("statictext", [0,0,80,20], "To");
        var h3 = headerGrp.add("statictext", [0,0,80,20], "Duration");
        var h4 = headerGrp.add("statictext", undefined, "Transcript Text");

        var editorGroup = win.add("group");
        editorGroup.orientation = "row";
        editorGroup.alignChildren = ["fill", "fill"];
        editorGroup.alignment = ["fill", "fill"];
        editorGroup.spacing = 5;

        var fromEditor, toEditor, durEditor, txtEditor;

        function createEditors(fontSize, content) {
            // Remove old ones if they exist
            if (fromEditor) editorGroup.remove(fromEditor);
            if (toEditor) editorGroup.remove(toEditor);
            if (durEditor) editorGroup.remove(durEditor);
            if (txtEditor) editorGroup.remove(txtEditor);

            // Use a fallback for font creation
            var fontObj;
            try {
                fontObj = ScriptUI.newFont("Tahoma", "REGULAR", fontSize);
            } catch (e) {
                fontObj = ScriptUI.newFont("Arial", "REGULAR", fontSize);
            }

            fromEditor = editorGroup.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { fromEditor.graphics.font = fontObj; fromEditor.font = fontObj; }
            fromEditor.preferredSize.width = 80;
            fromEditor.minimumSize.width = 50;
            fromEditor.alignment = ["left", "fill"];

            toEditor = editorGroup.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { toEditor.graphics.font = fontObj; toEditor.font = fontObj; }
            toEditor.preferredSize.width = 80;
            toEditor.minimumSize.width = 50;
            toEditor.alignment = ["left", "fill"];

            durEditor = editorGroup.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { durEditor.graphics.font = fontObj; durEditor.font = fontObj; }
            durEditor.preferredSize.width = 80;
            durEditor.minimumSize.width = 50;
            durEditor.alignment = ["left", "fill"];

            txtEditor = editorGroup.add("edittext", undefined, content || "", {multiline: true, scrolling: true});
            if (fontObj) { txtEditor.graphics.font = fontObj; txtEditor.font = fontObj; }
            txtEditor.alignment = ["fill", "fill"];
            txtEditor.preferredSize.width = 350;
            txtEditor.onChanging = updateTimings;

            win.layout.layout(true);
        }

        createEditors(20, "");

        var statusLbl = win.add("statictext", undefined, "Status: Ready");
        statusLbl.alignment = ["fill", "bottom"];

        // --- 4. Main Buttons ---
        var btnRun = win.add("button", undefined, "START WHISPER AI");
        btnRun.alignment = ["fill", "bottom"];
        var btnApply = win.add("button", undefined, "GENERATE TEXT LAYERS");
        btnApply.alignment = ["fill", "bottom"];
        btnApply.preferredSize.height = 40;

        var whisperDir = "C:\\whisper\\";
        var globalWordData = [];

        // --- وظيفة تحديث التوقيتات ---
        function updateTimings() {
            if (globalWordData.length === 0) return;
            var lines = txtEditor.text.split(/[\r\n]/);
            var fromLines = [], toLines = [], durLines = [];
            var wordIdx = 0;

            for (var i = 0; i < lines.length; i++) {
                var lineText = lines[i].replace(/^\s+|\s+$/g, "");
                if (lineText === "") {
                    fromLines.push("");
                    toLines.push("");
                    durLines.push("");
                    continue;
                }

                var wordsInLine = lineText.split(/\s+/).length;
                if (wordIdx >= globalWordData.length) {
                    fromLines.push("-"); toLines.push("-"); durLines.push("-");
                    continue;
                }

                var start = globalWordData[wordIdx].start;
                var endIdx = Math.min(wordIdx + wordsInLine - 1, globalWordData.length - 1);
                var end = globalWordData[endIdx].end;
                var duration = end - start;

                fromLines.push(start.toFixed(1));
                toLines.push(end.toFixed(1));
                durLines.push(duration.toFixed(1));

                wordIdx += wordsInLine;
            }
            fromEditor.text = fromLines.join("\n");
            toEditor.text = toLines.join("\n");
            durEditor.text = durLines.join("\n");
        }

        // --- وظيفة تحديث الخط الإجبارية ---
        function forceFontUpdate() {
            var newSize = Math.round(zoomSlider.value);
            zoomVal.text = newSize + "px";
            var savedText = txtEditor.text;

            // Try to save selection if possible
            var sel = null;
            try { sel = txtEditor.selection; } catch(e) {}

            // Force application to window graphics as well
            try {
                var f = ScriptUI.newFont("Tahoma", "REGULAR", newSize);
                win.graphics.font = f;
            } catch(e) {}

            createEditors(newSize, savedText);
            updateTimings();

            // Try to restore selection/focus
            try {
                txtEditor.active = true;
                if (sel) txtEditor.selection = sel;
            } catch(e) {}
        }

        zoomSlider.onChanging = function() {
            zoomVal.text = Math.round(this.value) + "px";
        };
        zoomSlider.onChange = forceFontUpdate;

        // --- Logic Functions ---
        function loadData(file) {
            file.open("r");
            var content = file.read();
            file.close();
            var data = eval("(" + content + ")");
            txtEditor.text = "";
            globalWordData = [];
            for (var i = 0; i < data.segments.length; i++) {
                txtEditor.text += data.segments[i].text.replace(/^\s+/, "") + "\n";
                if (data.segments[i].words) {
                    for (var w = 0; w < data.segments[i].words.length; w++) {
                        globalWordData.push(data.segments[i].words[w]);
                    }
                }
            }
            updateTimings();
        }

        btnLoad.onClick = function() {
            var f = File.openDialog("Select JSON");
            if (f) loadData(f);
        };

        btnSetup.onClick = function() {
            var comp = app.project.activeItem;
            if (!comp) return alert("Select Comp");
            while (app.project.renderQueue.numItems > 0) app.project.renderQueue.item(1).remove();
            var rq = app.project.renderQueue.items.add(comp);
            rq.outputModule(1).file = new File(whisperDir + "WhisRend.wav");
            alert("Setup Done. Render to WAV now.");
        };

        btnRun.onClick = function() {
            statusLbl.text = "Processing AI...";
            var py = "python \"" + whisperDir + "run_whisper.py\" \"" + whisperDir + "WhisRend.wav\" base ar";
            system.callSystem("cmd.exe /c \"" + py + "\"");
            var f = new File(whisperDir + "WhisRend.json");
            if (f.exists) loadData(f);
            statusLbl.text = "AI Done!";
        };

        btnApply.onClick = function() {
            if (txtEditor.text === "" || globalWordData.length === 0) return;
            app.beginUndoGroup("Whisper Subs");
            var lines = txtEditor.text.split("\n");
            var idx = 0;
            var comp = app.project.activeItem;
            for (var l = 0; l < lines.length; l++) {
                var s = lines[l].replace(/^\s+|\s+$/g, "");
                if (s == "") continue;
                var count = s.split(/\s+/).length;
                if (idx + count > globalWordData.length) count = globalWordData.length - idx;
                var layer = comp.layers.addText(s);
                layer.inPoint = globalWordData[idx].start;
                layer.outPoint = globalWordData[idx + count - 1].end;
                idx += count;
            }
            app.endUndoGroup();
            alert("Done!");
        };

        win.onResizing = win.onResize = function() {
            this.layout.layout(true);
        };

        win.layout.layout(true);

        if (win instanceof Window) {
            win.center();
            win.show();
        } else {
            win.layout.layout(true);
        }
    }

    buildWhisperUI(thisObj);
})(this);