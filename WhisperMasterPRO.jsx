(function(thisObj) {
    function buildWhisperUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Whisper Master PRO", undefined, {resizeable: true});

        var whisperDir = "C:\\whisper\\";
        var globalWordData = [];
        var fromEditor, toEditor, durEditor, txtEditor;

        win.orientation = "column";
        win.alignChildren = ["fill", "fill"];
        win.spacing = 10;
        win.margins = 15;

        var tpanel = win.add("tabbedpanel");
        tpanel.alignment = ["fill", "fill"];

        // ==========================================
        // --- Tab 1: AI & Editor ---
        // ==========================================
        var tabEditor = tpanel.add("tab", undefined, "1. AI & Editor");
        tabEditor.orientation = "column";
        tabEditor.alignChildren = ["fill", "fill"];
        tabEditor.spacing = 10;

        // --- 1. Settings Area ---
        var settingsGrp = tabEditor.add("group");
        settingsGrp.orientation = "row";
        settingsGrp.alignment = ["fill", "top"];
        settingsGrp.spacing = 10;

        var btnSetup = settingsGrp.add("button", undefined, "Setup Render");
        var btnLoad = settingsGrp.add("button", undefined, "Load JSON");

        settingsGrp.add("statictext", undefined, "Model:");
        var modelDropdown = settingsGrp.add("dropdownlist", undefined, ["tiny", "base", "small", "medium", "large"]);
        modelDropdown.selection = 1; // Default to 'base'

        // --- 2. Editor Font Settings ---
        var fontGrp = tabEditor.add("group");
        fontGrp.alignment = ["fill", "top"];
        fontGrp.add("statictext", undefined, "UI Font Size:");
        var zoomInput = fontGrp.add("edittext", undefined, "20");
        zoomInput.preferredSize.width = 40;
        fontGrp.add("statictext", undefined, "px");

        // --- 3. The Editor Container ---
        var headerGrp = tabEditor.add("group");
        headerGrp.orientation = "row";
        headerGrp.alignment = ["fill", "top"];
        headerGrp.spacing = 5;
        var hTitle = headerGrp.add("statictext", undefined, "Transcript Text");
        hTitle.preferredSize.width = 300;
        var h1 = headerGrp.add("statictext", [0,0,60,20], "From");
        var h2 = headerGrp.add("statictext", [0,0,60,20], "To");
        var h3 = headerGrp.add("statictext", [0,0,60,20], "Duration");

        var editorGroup = tabEditor.add("group");
        editorGroup.orientation = "row";
        editorGroup.alignChildren = ["fill", "fill"];
        editorGroup.alignment = ["fill", "fill"];
        editorGroup.spacing = 5;

        function createEditors(fontSize, content) {
            if (fromEditor) editorGroup.remove(fromEditor);
            if (toEditor) editorGroup.remove(toEditor);
            if (durEditor) editorGroup.remove(durEditor);
            if (txtEditor) editorGroup.remove(txtEditor);

            var fontObj;
            try {
                fontObj = ScriptUI.newFont("Tahoma", "REGULAR", fontSize);
            } catch (e) {
                fontObj = ScriptUI.newFont("Arial", "REGULAR", fontSize);
            }

            // Transcript Text on the LEFT
            txtEditor = editorGroup.add("edittext", undefined, content || "", {multiline: true, scrolling: true});
            if (fontObj) { txtEditor.graphics.font = fontObj; txtEditor.font = fontObj; }
            txtEditor.alignment = ["fill", "fill"];
            txtEditor.preferredSize.width = 300;
            txtEditor.preferredSize.height = 250;
            txtEditor.onChanging = updateTimings;

            // Timings on the RIGHT
            fromEditor = editorGroup.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { fromEditor.graphics.font = fontObj; fromEditor.font = fontObj; }
            fromEditor.preferredSize.width = 60;
            fromEditor.alignment = ["right", "fill"];

            toEditor = editorGroup.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { toEditor.graphics.font = fontObj; toEditor.font = fontObj; }
            toEditor.preferredSize.width = 60;
            toEditor.alignment = ["right", "fill"];

            durEditor = editorGroup.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { durEditor.graphics.font = fontObj; durEditor.font = fontObj; }
            durEditor.preferredSize.width = 60;
            durEditor.alignment = ["right", "fill"];

            win.layout.layout(true);
        }

        // ==========================================
        // --- Tab 2: Output Styling ---
        // ==========================================
        var tabStyle = tpanel.add("tab", undefined, "2. Text Style");
        tabStyle.orientation = "column";
        tabStyle.alignChildren = ["fill", "top"];
        tabStyle.spacing = 15;
        tabStyle.margins = 20;

        tabStyle.add("statictext", undefined, "Font Family:");
        var allFonts = [];
        try { allFonts = app.fonts.fontFamilyList; } catch(e) { allFonts = ["Arial", "Tahoma", "Courier"]; }
        var styleFontDrop = tabStyle.add("dropdownlist", undefined, allFonts);
        styleFontDrop.selection = 0;
        for(var f=0; f<allFonts.length; f++) { if(allFonts[f] == "Tahoma") styleFontDrop.selection = f; }

        var styleSizeGrp = tabStyle.add("group");
        styleSizeGrp.add("statictext", undefined, "Output Font Size:");
        var styleSizeInput = styleSizeGrp.add("edittext", undefined, "80");
        styleSizeInput.preferredSize.width = 50;

        tabStyle.add("statictext", undefined, "Paragraph Alignment:");
        var styleAlignDrop = tabStyle.add("dropdownlist", undefined, ["Right (العربية)", "Center", "Left"]);
        styleAlignDrop.selection = 0;

        // ==========================================
        // --- Bottom Controls ---
        // ==========================================
        var statusLbl = win.add("statictext", undefined, "Status: Ready");
        statusLbl.alignment = ["fill", "bottom"];

        var btnRun = win.add("button", undefined, "START WHISPER AI");
        btnRun.alignment = ["fill", "bottom"];

        var btnApply = win.add("button", undefined, "GENERATE TEXT LAYERS");
        btnApply.alignment = ["fill", "bottom"];
        btnApply.preferredSize.height = 40;

        tpanel.selection = 0;
        createEditors(20, "");

        // ==========================================
        // --- Logic & Functions ---
        // ==========================================

        function updateTimings() {
            if (globalWordData.length === 0) return;
            var lines = txtEditor.text.split(/[\r\n]/);
            var fromLines = [], toLines = [], durLines = [];
            var wordIdx = 0;

            for (var i = 0; i < lines.length; i++) {
                var lineText = lines[i].replace(/^\s+|\s+$/g, "");
                if (lineText === "") {
                    fromLines.push(""); toLines.push(""); durLines.push("");
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

        function forceFontUpdate() {
            var newSize = parseInt(zoomInput.text, 10);
            if (isNaN(newSize) || newSize <= 0) newSize = 20;
            var savedText = txtEditor.text;
            createEditors(newSize, savedText);
            updateTimings();
            try { txtEditor.active = true; } catch(e) {}
        }

        zoomInput.onChange = forceFontUpdate;

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
            if (!modelDropdown.selection) return alert("Please select a model");
            var selectedModel = modelDropdown.selection.text;
            statusLbl.text = "Processing AI (" + selectedModel + ")...";
            var py = "python \"" + whisperDir + "run_whisper.py\" \"" + whisperDir + "WhisRend.wav\" " + selectedModel + " ar";
            system.callSystem("cmd.exe /c \"" + py + "\"");
            var f = new File(whisperDir + "WhisRend.json");
            if (f.exists) loadData(f);
            statusLbl.text = "AI Done!";
        };

        btnApply.onClick = function() {
            if (txtEditor.text === "" || globalWordData.length === 0) return alert("No data to apply");

            var comp = app.project.activeItem;
            if (!comp) return alert("Select Comp");

            app.beginUndoGroup("Whisper Subs");

            var lines = txtEditor.text.split("\n");
            var idx = 0;

            var chosenFont = styleFontDrop.selection ? styleFontDrop.selection.text : "Tahoma";
            var fontSize = parseInt(styleSizeInput.text, 10);
            if (isNaN(fontSize)) fontSize = 80;
            var alignIdx = styleAlignDrop.selection ? styleAlignDrop.selection.index : 0;

            for (var l = 0; l < lines.length; l++) {
                var s = lines[l].replace(/^\s+|\s+$/g, "");
                if (s == "") continue;

                var count = s.split(/\s+/).length;
                if (idx + count > globalWordData.length) count = globalWordData.length - idx;

                var layer = comp.layers.addText(s);
                layer.inPoint = globalWordData[idx].start;
                layer.outPoint = globalWordData[idx + count - 1].end;

                // --- Apply Styling ---
                var textProp = layer.property("Source Text");
                var textDoc = textProp.value;
                textDoc.fontSize = fontSize;
                try { textDoc.font = chosenFont; } catch(e) {}

                if (alignIdx === 0) {
                    textDoc.justification = ParagraphJustification.RIGHT_JUSTIFY;
                } else if (alignIdx === 1) {
                    textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
                } else {
                    textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;
                }

                textProp.setValue(textDoc);

                // Force RTL Support expression
                layer.sourceText.expression = "value";

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