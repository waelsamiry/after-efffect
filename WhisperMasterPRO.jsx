(function(thisObj) {
    function buildWhisperUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Whisper Master PRO", undefined, {resizeable: true});

        // --- 1. Global State ---
        var whisperDir = "C:\\whisper\\";
        var globalWordData = [];
        var currentColor = [1, 1, 1]; // Default White
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

        // Settings (Fixed Top)
        var topGrp = tabEditor.add("group");
        topGrp.orientation = "column";
        topGrp.alignChildren = ["fill", "top"];
        topGrp.alignment = ["fill", "top"];
        topGrp.spacing = 10;

        var ctrlPnl = topGrp.add("panel", undefined, "Settings");
        ctrlPnl.orientation = "row";
        ctrlPnl.spacing = 10;

        var btnSetup = ctrlPnl.add("button", undefined, "Setup Render");
        var btnLoad = ctrlPnl.add("button", undefined, "Load JSON");
        ctrlPnl.add("statictext", undefined, "Model:");
        var modelDropdown = ctrlPnl.add("dropdownlist", undefined, ["tiny", "base", "small", "medium", "large"]);
        modelDropdown.selection = 1;

        var fontGrp = topGrp.add("group");
        fontGrp.add("statictext", undefined, "UI Font Size:");
        var zoomInput = fontGrp.add("edittext", undefined, "20");
        zoomInput.preferredSize.width = 50;

        var headerGrp = topGrp.add("group");
        headerGrp.orientation = "row";
        headerGrp.spacing = 5;
        headerGrp.alignment = ["fill", "top"];
        var hTitle = headerGrp.add("statictext", undefined, "Transcript Text");
        hTitle.alignment = ["fill", "top"];

        var timeHeaders = headerGrp.add("group");
        timeHeaders.alignment = ["right", "top"];
        timeHeaders.spacing = 5;
        timeHeaders.add("statictext", [0,0,60,20], "From");
        timeHeaders.add("statictext", [0,0,60,20], "To");
        timeHeaders.add("statictext", [0,0,60,20], "Dur");

        // Center Area (Flexible - Fills the gap)
        var mainArea = tabEditor.add("group");
        mainArea.orientation = "row";
        mainArea.alignChildren = ["fill", "fill"];
        mainArea.alignment = ["fill", "fill"];
        mainArea.maximumSize.height = 5000; // Force expansion

        function createEditors(fontSize, content) {
            if (fromEditor) mainArea.remove(fromEditor);
            if (toEditor) mainArea.remove(toEditor);
            if (durEditor) mainArea.remove(durEditor);
            if (txtEditor) mainArea.remove(txtEditor);

            var fontObj;
            try { fontObj = ScriptUI.newFont("Tahoma", "REGULAR", fontSize); } catch (e) { fontObj = ScriptUI.newFont("Arial", "REGULAR", fontSize); }

            txtEditor = mainArea.add("edittext", undefined, content || "", {multiline: true, scrolling: true});
            if (fontObj) { txtEditor.graphics.font = fontObj; txtEditor.font = fontObj; }
            txtEditor.alignment = ["fill", "fill"];
            txtEditor.onChanging = updateTimings;

            fromEditor = mainArea.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { fromEditor.graphics.font = fontObj; fromEditor.font = fontObj; }
            fromEditor.preferredSize.width = 60;
            fromEditor.alignment = ["right", "fill"];

            toEditor = mainArea.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { toEditor.graphics.font = fontObj; toEditor.font = fontObj; }
            toEditor.preferredSize.width = 60;
            toEditor.alignment = ["right", "fill"];

            durEditor = mainArea.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { durEditor.graphics.font = fontObj; durEditor.font = fontObj; }
            durEditor.preferredSize.width = 60;
            durEditor.alignment = ["right", "fill"];

            win.layout.layout(true);
        }

        var btnRun = tabEditor.add("button", undefined, "START WHISPER AI");
        btnRun.alignment = ["fill", "bottom"];
        btnRun.preferredSize.height = 40;

        // ==========================================
        // --- Tab 2: Font Settings ---
        // ==========================================
        var tabFont = tpanel.add("tab", undefined, "2. Font Settings");
        tabFont.orientation = "column";
        tabFont.alignChildren = ["fill", "top"];
        tabFont.spacing = 15;
        tabFont.margins = 20;

        tabFont.add("statictext", undefined, "Font Family:");
        var sysFonts = [];
        try { sysFonts = app.fonts.fontFamilyList; } catch(e) { sysFonts = ["Tahoma", "Arial", "Courier New"]; }
        var fontFamilyDropdown = tabFont.add("dropdownlist", undefined, sysFonts);
        fontFamilyDropdown.alignment = ["fill", "top"];
        if (sysFonts.length > 0) {
            fontFamilyDropdown.selection = 0;
            for(var f=0; f<sysFonts.length; f++) {
                if(sysFonts[f].indexOf("Tahoma") !== -1) { fontFamilyDropdown.selection = f; break; }
            }
        }

        var styleRow = tabFont.add("group");
        styleRow.alignment = ["fill", "top"];
        styleRow.add("statictext", undefined, "Font Size:");
        var outFontSizeInput = styleRow.add("edittext", undefined, "80");
        outFontSizeInput.preferredSize.width = 50;

        styleRow.add("statictext", undefined, "Align:");
        var alignDrop = styleRow.add("dropdownlist", undefined, ["Right", "Center", "Left"]);
        alignDrop.selection = 1;

        var colorGrp = tabFont.add("group");
        colorGrp.alignment = ["fill", "top"];
        colorGrp.add("statictext", undefined, "Color:");
        var colorBtn = colorGrp.add("button", undefined, "Pick Color");
        var colorPreview = colorGrp.add("panel", undefined, "");
        colorPreview.preferredSize = [60, 25];

        var applyBtn = tabFont.add("button", undefined, "GENERATE TEXT LAYERS");
        applyBtn.alignment = ["fill", "bottom"];
        applyBtn.preferredSize.height = 50;

        // Footer
        var bottomGrp = win.add("group");
        bottomGrp.orientation = "row";
        bottomGrp.alignment = ["fill", "bottom"];

        var statusLbl = bottomGrp.add("statictext", undefined, "Status: Ready");
        statusLbl.alignment = ["left", "center"];

        var sigLbl = bottomGrp.add("group");
        sigLbl.alignment = ["right", "center"];
        var sigTxt = sigLbl.add("statictext", undefined, "Designed by: wael samir");
        sigTxt.graphics.foregroundColor = sigTxt.graphics.newPen(sigTxt.graphics.PenType.SOLID_COLOR, [0.4, 0.7, 0.4, 1], 1);

        // ==========================================
        // --- Logic & Functions ---
        // ==========================================

        function updateTimings() {
            if (!globalWordData || globalWordData.length === 0) return;
            var lines = txtEditor.text.split(/[\r\n]/);
            var fromLines = [], toLines = [], durLines = [];
            var wordIdx = 0;
            for (var i = 0; i < lines.length; i++) {
                var lineText = lines[i].replace(/^\s+|\s+$/g, "");
                if (lineText === "") { fromLines.push(""); toLines.push(""); durLines.push(""); continue; }
                var wordsInLine = lineText.split(/\s+/).length;
                if (wordIdx >= globalWordData.length) { fromLines.push("-"); toLines.push("-"); durLines.push("-"); continue; }
                var start = globalWordData[wordIdx].start;
                var endIdx = Math.min(wordIdx + wordsInLine - 1, globalWordData.length - 1);
                var end = globalWordData[endIdx].end;
                fromLines.push(start.toFixed(1)); toLines.push(end.toFixed(1)); durLines.push((end - start).toFixed(1));
                wordIdx += wordsInLine;
            }
            fromEditor.text = fromLines.join("\n");
            toEditor.text = toLines.join("\n");
            durEditor.text = durLines.join("\n");
        }

        colorPreview.onDraw = function() {
            var g = this.graphics;
            var brush = g.newBrush(g.BrushType.SOLID_COLOR, currentColor);
            g.fillPath(brush, g.newPath());
        };

        colorBtn.onClick = function() {
            var hexColor = $.colorPicker();
            if (hexColor !== -1) {
                var r = (hexColor >> 16) & 0xff;
                var g = (hexColor >> 8) & 0xff;
                var b = hexColor & 0xff;
                currentColor = [r/255, g/255, b/255];
                colorPreview.notify("onDraw");
            }
        };

        zoomInput.onChange = function() {
            var newSize = parseInt(this.text, 10) || 20;
            createEditors(newSize, txtEditor.text);
            updateTimings();
        }

        btnLoad.onClick = function() {
            var f = File.openDialog("Select JSON File", "JSON files:*.json");
            if (f) {
                f.encoding = "UTF-8"; f.open("r");
                var content = f.read(); f.close();
                var data = eval("(" + content + ")");
                txtEditor.text = ""; globalWordData = [];
                for (var i = 0; i < data.segments.length; i++) {
                    txtEditor.text += data.segments[i].text.replace(/^\s+/, "") + "\n";
                    if (data.segments[i].words) {
                        for (var w = 0; w < data.segments[i].words.length; w++) { globalWordData.push(data.segments[i].words[w]); }
                    }
                }
                updateTimings();
            }
        };

        btnSetup.onClick = function() {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) return alert("Select a Comp");
            while (app.project.renderQueue.numItems > 0) app.project.renderQueue.item(1).remove();
            var rq = app.project.renderQueue.items.add(comp);
            rq.outputModule(1).file = new File(whisperDir + "WhisRend.wav");
            alert("Setup Done.");
        };

        btnRun.onClick = function() {
            if (!modelDropdown.selection) return alert("Select a model!");
            var model = modelDropdown.selection.text;
            statusLbl.text = "Processing AI...";
            system.callSystem("cmd.exe /c \"python \"" + whisperDir + "run_whisper.py\" \"" + whisperDir + "WhisRend.wav\" " + model + " ar\"");
            var f = new File(whisperDir + "WhisRend.json");
            if (f.exists) {
                f.encoding = "UTF-8"; f.open("r");
                var content = f.read(); f.close();
                var data = eval("(" + content + ")");
                txtEditor.text = ""; globalWordData = [];
                for (var i = 0; i < data.segments.length; i++) {
                    txtEditor.text += data.segments[i].text.replace(/^\s+/, "") + "\n";
                    if (data.segments[i].words) {
                        for (var w = 0; w < data.segments[i].words.length; w++) { globalWordData.push(data.segments[i].words[w]); }
                    }
                }
                updateTimings();
            }
            statusLbl.text = "AI Done!";
        };

        applyBtn.onClick = function() {
            if (txtEditor.text === "" || globalWordData.length === 0) return alert("No data");
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) return alert("Select a Comp");
            app.beginUndoGroup("Whisper Subs");
            var lines = txtEditor.text.split("\n");
            var idx = 0;
            var outSize = parseInt(outFontSizeInput.text, 10) || 80;
            var fontName = fontFamilyDropdown.selection ? fontFamilyDropdown.selection.text : "Tahoma";

            for (var l = 0; l < lines.length; l++) {
                var s = lines[l].replace(/^\s+|\s+$/g, "");
                if (s == "") continue;
                var count = s.split(/\s+/).length;
                if (idx + count > globalWordData.length) count = globalWordData.length - idx;
                var layer = comp.layers.addText(s);
                layer.inPoint = globalWordData[idx].start;
                layer.outPoint = globalWordData[idx + count - 1].end;

                var textProp = layer.property("Source Text");
                var textDoc = textProp.value;
                textDoc.fontSize = outSize;
                textDoc.fillColor = currentColor;
                try { textDoc.font = fontName; } catch(e) {}

                if (alignDrop.selection.index === 0) textDoc.justification = ParagraphJustification.RIGHT_JUSTIFY;
                else if (alignDrop.selection.index === 1) textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
                else textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;

                textProp.setValue(textDoc);
                layer.sourceText.expression = "value";

                idx += count;
            }
            app.endUndoGroup();
            alert("Done!");
        };

        win.onResizing = win.onResize = function() { this.layout.layout(true); };
        createEditors(20, "");
        win.layout.layout(true);

        if (win instanceof Window) { win.center(); win.show(); }
    }
    buildWhisperUI(thisObj);
})(this);