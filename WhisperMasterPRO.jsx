(function(thisObj) {
    function buildWhisperUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Whisper Master PRO", undefined, {resizeable: true});
        win.preferredSize = [650, 850];
        win.minimumSize = [500, 400];

        var whisperDir = "C:\\whisper\\";
        var globalWordData = [];
        var fromEditor, toEditor, durEditor, txtEditor;

        win.orientation = "column";
        win.alignChildren = ["fill", "fill"];
        win.spacing = 10;
        win.margins = 15;

        var tpanel = win.add("tabbedpanel");
        tpanel.alignment = ["fill", "fill"]; // التبويبات تملأ كل المساحة المتاحة طولاً وعرضاً

        // ==========================================
        // --- Tab 1: AI & Editor ---
        // ==========================================
        var tabEditor = tpanel.add("tab", undefined, "1. AI & Editor");
        tabEditor.orientation = "column";
        tabEditor.alignChildren = ["fill", "fill"];
        tabEditor.spacing = 10;

        // مجموعة الإعدادات العلوية (ثابتة في الأعلى)
        var topGrp = tabEditor.add("group");
        topGrp.orientation = "row";
        topGrp.alignChildren = ["fill", "center"];
        topGrp.alignment = ["fill", "top"];
        topGrp.spacing = 20;

        var btnSetup = topGrp.add("button", undefined, "Setup Render");
        btnSetup.alignment = ["fill", "center"];
        var btnLoad = topGrp.add("button", undefined, "Load JSON");
        btnLoad.alignment = ["fill", "center"];

        var modelGrp = topGrp.add("group");
        modelGrp.alignment = ["fill", "center"];
        modelGrp.add("statictext", undefined, "Model:");
        var modelDropdown = modelGrp.add("dropdownlist", undefined, ["tiny", "base", "small", "medium", "large"]);
        modelDropdown.selection = 1;
        modelDropdown.alignment = ["fill", "center"];

        var headerGrp = tabEditor.add("group");
        headerGrp.orientation = "row";
        headerGrp.spacing = 5;
        headerGrp.alignment = ["fill", "top"];

        var hTitle = headerGrp.add("statictext", undefined, "Transcript Text (Editable)");
        hTitle.alignment = ["fill", "center"];

        var fontGrp = headerGrp.add("group");
        fontGrp.add("statictext", undefined, "UI Font Size:");
        var zoomInput = fontGrp.add("edittext", undefined, "20");
        zoomInput.preferredSize.width = 40;
        fontGrp.add("statictext", undefined, "px");

        zoomInput.onChanging = function() {
            var val = parseInt(this.text, 10);
            if (!isNaN(val) && val > 0) {
                var currentContent = txtEditor ? txtEditor.text : "";
                createEditors(val, currentContent);
                updateTimings();
            }
        };

        var hTimingsGrp = headerGrp.add("group");
        hTimingsGrp.spacing = 5;

        // --- مجمع المحرر (هذا هو الجزء الذي سيمدد "الزق" للأزرار) ---
        var editorGroup = tabEditor.add("group");
        editorGroup.orientation = "row";
        editorGroup.spacing = 5;
        editorGroup.alignChildren = ["fill", "fill"];
        editorGroup.alignment = ["fill", "fill"]; // تمدد كامل

        function createEditors(fontSize, content) {
            if (fromEditor) editorGroup.remove(fromEditor);
            if (toEditor) editorGroup.remove(toEditor);
            if (durEditor) editorGroup.remove(durEditor);
            if (txtEditor) editorGroup.remove(txtEditor);

            var fontObj;
            try { fontObj = ScriptUI.newFont("Tahoma", "REGULAR", fontSize); } catch (e) { fontObj = ScriptUI.newFont("Arial", "REGULAR", fontSize); }

            txtEditor = editorGroup.add("edittext", undefined, content || "", {multiline: true, scrolling: true});
            txtEditor.alignment = ["fill", "fill"];
            txtEditor.onChanging = updateTimings;

            var timeOptions = {multiline: true, scrolling: false, readonly: true};
            fromEditor = editorGroup.add("edittext", undefined, "", timeOptions);
            toEditor = editorGroup.add("edittext", undefined, "", timeOptions);
            durEditor = editorGroup.add("edittext", undefined, "", timeOptions);

            var colW = Math.max(55, fontSize * 3);

            // Re-create header labels to match width
            if (hTimingsGrp.children.length > 0) {
                for (var k = hTimingsGrp.children.length - 1; k >= 0; k--) hTimingsGrp.remove(hTimingsGrp.children[k]);
            }
            var hFrom = hTimingsGrp.add("statictext", undefined, "From");
            var hTo = hTimingsGrp.add("statictext", undefined, "To");
            var hDur = hTimingsGrp.add("statictext", undefined, "Dur");
            hFrom.preferredSize.width = hTo.preferredSize.width = hDur.preferredSize.width = colW;
            hFrom.justify = hTo.justify = hDur.justify = "center";

            var editors = [fromEditor, toEditor, durEditor, txtEditor];
            for(var i=0; i<4; i++) {
                if (fontObj) { editors[i].graphics.font = fontObj; editors[i].font = fontObj; }
                if(i < 3) {
                    editors[i].preferredSize.width = colW;
                    editors[i].alignment = ["right", "fill"];
                    editors[i].justify = "center";
                }
            }
            win.layout.layout(true);
        }

        // ==========================================
        // --- Tab 2: Output Styling ---
        // ==========================================
        var tabStyle = tpanel.add("tab", undefined, "2. Text Style");
        tabStyle.orientation = "column";
        tabStyle.alignChildren = ["fill", "top"];
        tabStyle.spacing = 15;

        tabStyle.add("statictext", undefined, "Font Family:");
        var allFonts = [];
        try { allFonts = app.fonts.fontFamilyList; } catch(e) { allFonts = ["Arial", "Tahoma"]; }
        var styleFontDrop = tabStyle.add("dropdownlist", undefined, allFonts);
        styleFontDrop.selection = 0;
        var styleSizeGrp = tabStyle.add("group");
        styleSizeGrp.add("statictext", undefined, "Output Font Size:");
        var styleSizeInput = styleSizeGrp.add("edittext", undefined, "80");
        var styleAlignDrop = tabStyle.add("dropdownlist", undefined, ["Right (العربية)", "Center", "Left"]);
        styleAlignDrop.selection = 0;

        // ==========================================
        // --- Bottom Area (الأزرار ثابتة في الأسفل) ---
        // ==========================================
        var bottomGrp = win.add("group");
        bottomGrp.orientation = "column";
        bottomGrp.alignChildren = ["fill", "bottom"];
        bottomGrp.alignment = ["fill", "bottom"]; // يلتصق بالأسفل
        bottomGrp.spacing = 5;

        var statusLbl = bottomGrp.add("statictext", undefined, "Status: Ready");

        var botBtnGrp = bottomGrp.add("group");
        botBtnGrp.orientation = "row";
        botBtnGrp.alignChildren = ["fill", "fill"];
        botBtnGrp.alignment = ["fill", "bottom"];
        botBtnGrp.spacing = 10;

        var btnRun = botBtnGrp.add("button", undefined, "START WHISPER AI");
        btnRun.preferredSize.height = 50;
        btnRun.alignment = ["fill", "fill"];
        var btnApply = botBtnGrp.add("button", undefined, "GENERATE TEXT LAYERS");
        btnApply.preferredSize.height = 50;
        btnApply.alignment = ["fill", "fill"];

        // تفعيل الوظائف
        tpanel.selection = 0;
        createEditors(20, "");

        // --- Logic ---
        function updateTimings() {
            if (globalWordData.length === 0 || !txtEditor) return;
            var lines = txtEditor.text.split(/[\r\n]/), fL = [], tL = [], dL = [], wordIdx = 0;
            for (var i = 0; i < lines.length; i++) {
                var lineText = lines[i].replace(/^\s+|\s+$/g, "");
                if (lineText === "") { fL.push(""); tL.push(""); dL.push(""); continue; }
                var wordsInLine = lineText.split(/\s+/).length;
                if (wordIdx >= globalWordData.length) { fL.push("-"); tL.push("-"); dL.push("-"); continue; }
                var start = globalWordData[wordIdx].start;
                var end = globalWordData[Math.min(wordIdx + wordsInLine - 1, globalWordData.length - 1)].end;
                fL.push(start.toFixed(1)); tL.push(end.toFixed(1)); dL.push((end - start).toFixed(1));
                wordIdx += wordsInLine;
            }
            fromEditor.text = fL.join("\n"); toEditor.text = tL.join("\n"); durEditor.text = dL.join("\n");
        }

        function loadData(file) {
            file.encoding = "UTF-8"; file.open("r"); var content = file.read(); file.close();
            if (!content) return;
            var data; try { data = JSON.parse(content); } catch (e) { data = eval("(" + content + ")"); }
            txtEditor.text = ""; globalWordData = [];
            if(data.segments){
                for (var i = 0; i < data.segments.length; i++) {
                    txtEditor.text += data.segments[i].text.replace(/^\s+/, "") + "\n";
                    if (data.segments[i].words) for (var w = 0; w < data.segments[i].words.length; w++) globalWordData.push(data.segments[i].words[w]);
                }
            }
            updateTimings();
        }

        btnLoad.onClick = function() {
            var filter = (File.fs == "Windows") ? "JSON files:*.json;All files:*.*" : function(f) { return f instanceof Folder || f.name.match(/\.json$/i) || f.name.match(/.*$/i); };
            var f = File.openDialog("Select JSON", filter); if (f) loadData(f);
        };

        btnSetup.onClick = function() {
            var comp = app.project.activeItem; if (!comp) return alert("Select Comp");
            while (app.project.renderQueue.numItems > 0) app.project.renderQueue.item(1).remove();
            var rq = app.project.renderQueue.items.add(comp);
            rq.outputModule(1).file = new File(whisperDir + "WhisRend.wav"); alert("Setup Done. Render to WAV now.");
        };

        btnRun.onClick = function() {
            statusLbl.text = "Processing AI...";
            win.update();
            var py = "python \"" + whisperDir + "run_whisper.py\" \"" + whisperDir + "WhisRend.wav\" " + modelDropdown.selection.text + " ar";
            system.callSystem("cmd.exe /c \"" + py + "\"");
            var f = new File(whisperDir + "WhisRend.json"); if (f.exists) loadData(f);
            statusLbl.text = "AI Done!";
        };

        btnApply.onClick = function() {
            if (txtEditor.text === "" || globalWordData.length === 0) return alert("No data");
            var comp = app.project.activeItem; if (!comp) return alert("Select Comp");
            app.beginUndoGroup("Whisper Subs");
            var lines = txtEditor.text.split("\n"), idx = 0, fontSize = parseInt(styleSizeInput.text, 10) || 80;
            for (var l = 0; l < lines.length; l++) {
                var s = lines[l].replace(/^\s+|\s+$/g, ""); if (s == "") continue;
                var count = s.split(/\s+/).length; if (idx + count > globalWordData.length) count = globalWordData.length - idx;
                var layer = comp.layers.addText(s);
                layer.inPoint = globalWordData[idx].start; layer.outPoint = globalWordData[idx + count - 1].end;
                var textProp = layer.property("Source Text"), textDoc = textProp.value;
                textDoc.fontSize = fontSize; if (styleFontDrop.selection) try { textDoc.font = styleFontDrop.selection.text; } catch(e) {}
                var alignIdx = styleAlignDrop.selection ? styleAlignDrop.selection.index : 0;
                textDoc.justification = [ParagraphJustification.RIGHT_JUSTIFY, ParagraphJustification.CENTER_JUSTIFY, ParagraphJustification.LEFT_JUSTIFY][alignIdx];
                textProp.setValue(textDoc); idx += count;
            }
            app.endUndoGroup(); alert("Done!");
        };

        win.onResizing = win.onResize = function() { this.layout.layout(true); };
        win.layout.layout(true);
        if (win instanceof Window) { win.center(); win.show(); }
    }
    buildWhisperUI(thisObj);
})(this);