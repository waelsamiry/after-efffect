(function(thisObj) {
    function buildWhisperUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Whisper Master PRO", undefined, {resizeable: true});

        // --- 1. Global Variables & State ---
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

        // Settings Row
        var settingsGrp = tabEditor.add("group");
        settingsGrp.orientation = "row";
        settingsGrp.alignment = ["fill", "top"];
        settingsGrp.spacing = 10;

        var btnSetup = settingsGrp.add("button", undefined, "Setup Render");
        var btnLoad = settingsGrp.add("button", undefined, "Load JSON");

        settingsGrp.add("statictext", undefined, "Model:");
        var modelDropdown = settingsGrp.add("dropdownlist", undefined, ["tiny", "base", "small", "medium", "large"]);
        modelDropdown.selection = 1;

        // UI Font Size Row
        var uiFontGrp = tabEditor.add("group");
        uiFontGrp.alignment = ["fill", "top"];
        uiFontGrp.add("statictext", undefined, "UI Font Size:");
        var uiFontSizeInput = uiFontGrp.add("edittext", undefined, "20");
        uiFontSizeInput.preferredSize.width = 40;
        uiFontGrp.add("statictext", undefined, "px");

        // Headers
        var headerGrp = tabEditor.add("group");
        headerGrp.orientation = "row";
        headerGrp.alignment = ["fill", "top"];
        headerGrp.spacing = 5;
        var hTitle = headerGrp.add("statictext", undefined, "Transcript Text");
        hTitle.preferredSize.width = 250;
        headerGrp.add("statictext", [0,0,50,20], "From");
        headerGrp.add("statictext", [0,0,50,20], "To");
        headerGrp.add("statictext", [0,0,50,20], "Dur");

        // Editors Group
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
            try { fontObj = ScriptUI.newFont("Tahoma", "REGULAR", fontSize); } catch (e) {}

            txtEditor = editorGroup.add("edittext", undefined, content || "", {multiline: true, scrolling: true});
            if (fontObj) { txtEditor.graphics.font = fontObj; txtEditor.font = fontObj; }
            txtEditor.alignment = ["fill", "fill"];
            txtEditor.preferredSize.width = 250;
            txtEditor.onChanging = updateTimings;

            fromEditor = editorGroup.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { fromEditor.graphics.font = fontObj; fromEditor.font = fontObj; }
            fromEditor.preferredSize.width = 50;

            toEditor = editorGroup.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { toEditor.graphics.font = fontObj; toEditor.font = fontObj; }
            toEditor.preferredSize.width = 50;

            durEditor = editorGroup.add("edittext", undefined, "", {multiline: true, scrolling: false, readonly: true});
            if (fontObj) { durEditor.graphics.font = fontObj; durEditor.font = fontObj; }
            durEditor.preferredSize.width = 50;

            win.layout.layout(true);
        }

        var btnRun = tabEditor.add("button", undefined, "START WHISPER AI");
        btnRun.preferredSize.height = 40;

        // ==========================================
        // --- Tab 2: Font Settings ---
        // ==========================================
        var tabFont = tpanel.add("tab", undefined, "2. Font Settings");
        tabFont.orientation = "column";
        tabFont.alignChildren = ["fill", "top"];
        tabFont.spacing = 15;
        tabFont.margins = 20;

        // Font Family
        tabFont.add("statictext", undefined, "Font Family:");
        var sysFonts = [];
        try {
            sysFonts = app.fonts.fontFamilyList;
        } catch(e) {
            sysFonts = ["Tahoma", "Arial", "Courier New"];
        }
        var fontFamilyDropdown = tabFont.add("dropdownlist", undefined, sysFonts);
        fontFamilyDropdown.preferredSize.width = 250;
        if (sysFonts.length > 0) {
            fontFamilyDropdown.selection = 0;
            for(var f=0; f<sysFonts.length; f++) {
                if(sysFonts[f].indexOf("Tahoma") !== -1) { fontFamilyDropdown.selection = f; break; }
            }
        }

        // Font Size & Alignment
        var styleRow = tabFont.add("group");
        styleRow.add("statictext", undefined, "Font Size:");
        var outFontSizeInput = styleRow.add("edittext", undefined, "80");
        outFontSizeInput.preferredSize.width = 50;

        styleRow.add("statictext", undefined, "Align:");
        var alignDrop = styleRow.add("dropdownlist", undefined, ["Right", "Center", "Left"]);
        alignDrop.selection = 1;

        // Color Picker
        var colorGrp = tabFont.add("group");
        colorGrp.add("statictext", undefined, "Color:");
        var colorBtn = colorGrp.add("button", undefined, "Pick Color");
        var colorPreview = colorGrp.add("panel", undefined, "");
        colorPreview.preferredSize = [60, 25];

        // Generate Button
        var applyBtn = tabFont.add("button", undefined, "GENERATE TEXT LAYERS");
        applyBtn.preferredSize.height = 50;

        // ==========================================
        // --- Logic & Functions ---
        // ==========================================

        function updateTimings() {
            if (globalWordData.length === 0) return;
            var lines = txtEditor.text.split(/[\r\n]/);
            var fLines = [], tLines = [], dLines = [];
            var wordIdx = 0;

            for (var i = 0; i < lines.length; i++) {
                var s = lines[i].replace(/^\s+|\s+$/g, "");
                if (s === "") { fLines.push(""); tLines.push(""); dLines.push(""); continue; }

                var count = s.split(/\s+/).length;
                if (wordIdx >= globalWordData.length) { fLines.push("-"); tLines.push("-"); dLines.push("-"); continue; }

                var start = globalWordData[wordIdx].start;
                var endIdx = Math.min(wordIdx + count - 1, globalWordData.length - 1);
                var end = globalWordData[endIdx].end;

                fLines.push(start.toFixed(1));
                tLines.push(end.toFixed(1));
                dLines.push((end - start).toFixed(1));
                wordIdx += count;
            }
            fromEditor.text = fLines.join("\n");
            toEditor.text = tLines.join("\n");
            durEditor.text = dLines.join("\n");
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

        uiFontSizeInput.onChange = function() {
            var size = parseInt(this.text, 10);
            if (isNaN(size) || size <= 0) size = 20;
            createEditors(size, txtEditor.text);
            updateTimings();
        };

        btnSetup.onClick = function() {
            var comp = app.project.activeItem;
            if (!comp) return alert("Select Comp");
            while (app.project.renderQueue.numItems > 0) app.project.renderQueue.item(1).remove();
            var rq = app.project.renderQueue.items.add(comp);
            rq.outputModule(1).file = new File(whisperDir + "WhisRend.wav");
            alert("Setup Done. Render to WAV now.");
        };

        btnLoad.onClick = function() {
            var f = File.openDialog("Select JSON");
            if (f) {
                f.open("r");
                var data = eval("(" + f.read() + ")");
                f.close();
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
        };

        btnRun.onClick = function() {
            if (!modelDropdown.selection) return alert("Select a model!");
            var model = modelDropdown.selection.text;
            var py = "python \"" + whisperDir + "run_whisper.py\" \"" + whisperDir + "WhisRend.wav\" " + model + " ar";
            system.callSystem("cmd.exe /c \"" + py + "\"");
            var f = new File(whisperDir + "WhisRend.json");
            if (f.exists) {
                f.open("r");
                var data = eval("(" + f.read() + ")");
                f.close();
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
        };

        applyBtn.onClick = function() {
            if (txtEditor.text === "" || globalWordData.length === 0) return alert("No data loaded!");
            var comp = app.project.activeItem;
            if (!comp) return alert("Select a Comp first!");

            app.beginUndoGroup("Whisper Generate");
            var lines = txtEditor.text.split("\n");
            var wordIdx = 0;
            var outSize = parseInt(outFontSizeInput.text, 10);
            if (isNaN(outSize)) outSize = 80;
            var fontName = fontFamilyDropdown.selection ? fontFamilyDropdown.selection.text : "Tahoma";

            for (var i = 0; i < lines.length; i++) {
                var s = lines[i].replace(/^\s+|\s+$/g, "");
                if (s === "") continue;

                var count = s.split(/\s+/).length;
                if (wordIdx + count > globalWordData.length) count = globalWordData.length - wordIdx;

                var layer = comp.layers.addText(s);
                layer.inPoint = globalWordData[wordIdx].start;
                layer.outPoint = globalWordData[wordIdx + count - 1].end;

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

                wordIdx += count;
            }
            app.endUndoGroup();
            alert("Layers Created!");
        };

        // Initialize
        createEditors(20, "");
        win.onResizing = win.onResize = function() { this.layout.layout(true); };
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