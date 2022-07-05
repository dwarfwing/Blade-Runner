    /* number and log handling */
    const int = (score, on_error = 0) => parseInt(score) || on_error;
    const float = (score, on_error = 0) => parseFloat(score) || on_error;
    const clog = (text, title = "", color = "green", style = "font-size:12px; font-weight:normal;", headerstyle = "font-size:13px; font-weight:bold;") => {
        let titleStyle = `color:${color}; ${headerstyle} text-decoration:underline;`;
        let textStyle = `color:${color}; ${style}`;
        let output = `%c${title} %c${text}`;
        if (title) {
        console.log(output, titleStyle, textStyle);
        } else {
        output = `%c${text}`;
        console.log(output, textStyle);
        }
    };

    /* Oosh async attribute functions */
    const asw = (() => {
        const setActiveCharacterId = function(charId){
            let oldAcid=getActiveCharacterId();
            let ev = new CustomEvent("message");
            ev.data={"id":"0", "type":"setActiveCharacter", "data":charId};
            self.dispatchEvent(ev);
            return oldAcid;
        };
        const promisifyWorker = (worker, parameters) => {
            let acid=getActiveCharacterId(); 
            let prevAcid=null;               
            return new Promise((res,rej)=>{
                prevAcid=setActiveCharacterId(acid);  
                try {if (worker===0) getAttrs(parameters[0]||[],(v)=>res(v));
                    else if (worker===1) setAttrs(parameters[0]||{}, parameters[1]||{},(v)=>res(v));
                    else if (worker===2) getSectionIDs(parameters[0]||'',(v)=>res(v));
                } catch(err) {rej(console.error(err))}
            }).finally(()=>setActiveCharacterId(prevAcid));
        }
        return {
            getAttrs(attrArray) {return promisifyWorker(0, [attrArray])},
            setAttrs(attrObj, options) {return promisifyWorker(1, [attrObj, options])},
            getSectionIDs(section) {return promisifyWorker(2, [section])},
            setActiveCharacterId,
        }
    })();

    // METHODS FOR PARSED ROLLS
    const rollEscape = {
        chars: { '"': '%quot;', ',': '%comma;', ':': '%colon;', '}': '%rcub;', '{': '%lcub;', },
        escape(str) {
            str = (typeof(str) === 'object') ? JSON.stringify(str) : (typeof(str) === 'string') ? str : null;
            return (str) ? `${str}`.replace(new RegExp(`[${Object.keys(this.chars)}]`, 'g'), (r) => this.chars[r]) : null;
        },
        unescape(str) {
            str = `${str}`.replace(new RegExp(`(${Object.values(this.chars).join('|')})`, 'g'), (r) => Object.entries(this.chars).find(e=>e[1]===r)[0]);
            return JSON.parse(str);
        }
    }
    
	// Helper function to grab player input
	const getQuery = async (queryText) => {
		const rxGrab = /^0\[(.*)\]\s*$/;
		let rollBase = `! {{query1=[[ 0[${queryText}] ]]}}`, // just a [[0]] roll with an inline tag
			queryRoll = await startRoll(rollBase),
			queryResponse = (queryRoll.results.query1.expression.match(rxGrab) || [])[1]; 
		finishRoll(queryRoll.rollId); // you can just let this time out if you want - we're done with it
		return queryResponse;
	};

    /* GiGs 'Super Simple Summarizer' */
    const repeatingSum = (destination, section, fields, multiplier = 1) => {
      if (!Array.isArray(fields)) fields = [fields];
      getSectionIDs(`repeating_${section}`, (idArray) => {
        const attrArray = idArray.reduce((m, id) => [...m, ...fields.map((field) => `repeating_${section}_${id}_${field}`)], []);
        getAttrs(attrArray, (v) => {
          //clog("values of v: " + JSON.stringify(v));
          // getValue: if not a number, returns 1 if it is 'on' (checkbox), otherwise returns 0..
          const getValue = (section, id, field) => float(v[`repeating_${section}_${id}_${field}`]) || (v[`repeating_${section}_${id}_${field}`] === "on" ? 1 : 0);
    
          const sumTotal = idArray.reduce((total, id) => total + fields.reduce((subtotal, field) => subtotal * getValue(section, id, field), 1), 0);
          setAttrs({
            [destination]: sumTotal * multiplier,
          });
        });
      });
    };

    /* Roll buttons to use input values for launching action buttons with %{@{character_name|action}}
    on('sheet:opened change:character_name', function() {
        getAttrs(["character_name"], function(values){
            const actions = ['customroll_action','customrolladv_action','customrolldis_action'
            ];
            const setObj = actions.reduce((accumulator,actionName)=>{
                accumulator[actionName] = `%{${values.character_name}|${actionName.replace(/_/g,'-')}}`;//Update the action call
                return accumulator; //The memo (accumulator in this case) must always be returned when using a reduce function
            },{});
            setAttrs(setObj,{silent:true});//Apply the changes
        });    
    }); */

    // VERSIONING
    // If need for specific data updates with new version then include as a case comparing sheet version with version in the below Switch statement
    on("sheet:opened", () => {
        getAttrs(["sheetversion", "version", "newchar"], (values) => {
            var sheet = float(values.sheetversion),
            actual = float(values.version),
            newchar = int(values.newchar);
            clog(`Versioning; sheet version: ${sheet}, actual: ${actual}, new char: ${newchar}`);

            // Add additional check below, e.g. case newchar != 1 && actual < 2.02
            // In the case statements, call on a separate function to handle data upgrades and other necessary changes
            switch (true) {
                case newchar == 1 :
                    // A new character would always be on the sheet version, no need to bother with upgrades but need to reset the newchar attribute
                    clog(`New character identified. New char: ${newchar}, sheet version: ${sheet}, actual: ${actual}`);
                    setAttrs({
                        version: sheet,
                        newchar: 0,
                        config_notice: 1,
                        radiation_perm: 0   // Setting permanent radiation to 0 to support the CSS rules, without value they do not work
                    });
                    break;  
                /*
                case actual < float(4.02) : 
                    clog(`New version upgrade needed. Sheet version: ${sheet}, actual: ${actual}`);
                    upg_4_02();
                    */
                case actual < sheet :
                    // This can be use as example of upgrade handling, use specific versions in the case logic to handle version specific upgrade of attributes, e.g. actual < 2.10 :
                    // Any upgrade handling needs to be done above this one, and may set the actual variable to be same as sheet to avoid doing the below setAttrs twice.
                    clog(`Updating version. Sheet version: ${sheet}, actual: ${actual}`);
                    // Add reference to upgrade function here, if needed, e.g. upgrade_to_2.24() 
                    setAttrs({
                        version: sheet,
                        newchar: 0,
                        config_notice: 1
                    });
                    // In case an upgrade can be followed by further upgrading, then omit the break at this stage to move down the list of cases
                    break;
            }
        });
    });

    /* SET MAX HEALTH */
    on("change:health_max change:health_mod change:strength change:agility sheet:opened", async () => {
        const attrs = await asw.getAttrs(['strength','agility','health_max','health_mod']);
        const health = Math.ceil( ( int(attrs['strength']) + int(attrs['agility'])) / 4 ) + int(attrs['health_mod']);
        clog(`Max health is ${health}`);
        await asw.setAttrs({health_max: health});
    });
    /* SET MAX RESOLVE */
    on("change:resolve_max change:resolve_mod change:intelligence change:empathy sheet:opened", async () => {
        const attrs = await asw.getAttrs(['intelligence','empathy','resolve_max','resolve_mod']);
        const resolve = Math.ceil( ( int(attrs['intelligence']) + int(attrs['empathy'])) / 4 ) + int(attrs['resolve_mod']);
        clog(`Max resolve is ${resolve}`);
        await asw.setAttrs({resolve_max: resolve});
    });

    // SET SECRET ROLL 
    on('change:secretrolls sheet:opened', (ev) => {
        getAttrs(['secretrolls', 'rollcommand'], (values) => {
            //clog(`Secret roll update: ${JSON.stringify(ev)}`);
            const s = int(values.secretrolls);
            var r = "/w gm";
            clog(`Secret rolls (${s}): `+ !( s == "0" || !s ));
            if ( s == "0" || !s ) {
                r = "";
            } 
            setAttrs({
                rollcommand: r
            });
        });
    });
    /***** PARSED ROLLS ************************************************/
    
    // Return the code used in roll template for normal, advantage, or disadvantage based on the name of the action
    const checkAdvantageRoll = (str) => {
        return (str.slice(-3) == "adv" ? 1 : (str.slice(-3) == "dis" ? -1 : 0));
    }

    // The actual parsed roll
    const parsedRoll = async (rollaction, rollname, dieone, dieoneadv, dieonesize, dietwo, dietwoadv, dietwosize, push, comment, adv = 0 ) => {
        //const rolladv = checkAdvantageRoll(rollaction);
        
        const attrs = await asw.getAttrs(["charactertype"]),
            pushleft = int(attrs.charactertype),
            chartype = int(attrs.charactertype);

        if ( int(push) == 0 && !("@{charactertype}") ) {
            const abort = await startRoll('/em Maximum push reached');
            finishRoll(abort.rollId);
            return 0;
        }
        var commentStr = "";
        if ( comment && comment != "" ) {
            commentStr = `{{comment=${comment}}}`;
        }

        let rollBase = `@{rollcommand} &{template:bladerunner} {{character-name=@{character_name}}} {{roll-name=${rollname}}} ${commentStr} {{roll-adv=[[${adv}]]}} {{die-one-size=[[${dieonesize}]]}} {{die-two-size=[[${dietwosize}]]}} {{die-one=[[1D${dieone}]]}}  {{die-one-adv=[[1D${dieone}]]}} {{die-two=[[1D${dietwo}]]}} {{die-two-adv=[[1D${dietwo}]]}} {{push=${push}}} {{button=[Push](&#37;push)}}`;
        let firstRoll = await startRoll(rollBase);

        //    rollValue = firstRoll.results.roll1.result;
        clog(`First roll data: ${JSON.stringify(firstRoll)}`);
        clog(`First roll results: ${JSON.stringify(firstRoll.results)}`);
        // Storing all the passthrough data required for the next roll in an Object helps for larger rolls

        /* let rollData = {
            roller: attrs.character_name,
        } */
        const results = firstRoll.results; 
        clog(`results: ${JSON.stringify(results)}`);
        clog(`die 1: ${JSON.stringify(results['die-one'])}`);
        clog(`die 2: ${JSON.stringify(results['die-two'])}`);
        clog(`die 1 adv: ${JSON.stringify(results['die-one-adv'])}`);
        clog(`die 2 adv: ${JSON.stringify(results['die-two-adv'])}`);

        const rollnameStr = rollname.startsWith("Push: ") ? rollname : "Push: "+rollname; 

        clog(`ROll name is now: ${rollnameStr}`);

        clog(`Values are: ${rollnameStr}, ${dieone}, ${dietwo}, ${dieoneadv}, ${dietwoadv}, ${dieonesize}, ${dietwosize}, ${adv}, ${pushleft}, ${results['die-one'].result}, ${results['die-one-adv'].result}, ${results['die-two'].result}, ${results['die-two-adv'].result} `);

        setAttrs({
            pushrollaction: rollaction,
            pushrollname: rollnameStr,
            pushdieone: dieone,
            pushdietwo: dietwo,
            pushdieoneadv: dieoneadv,
            pushdietwoadv: dietwoadv,
            pushdieonesize: dieonesize,
            pushdietwosize: dietwosize,
            pushrolladv: adv,
            push: pushleft,
            pushdieoner1: results['die-one'].result,
            pushdieoner2: results['die-one-adv'].result,
            pushdietwor1: results['die-two'].result,
            pushdietwor2: results['die-two-adv'].result
        });

        clog('Finishing roll...');

        // Finish the roll, passing the escaped rollData object into the template as computed::passthroughdata
        // Our roll template then inserts that into [butonlabel](~selected|buttonlink||<computed::passthroughdata>)
        // ~selected allows anyone to click the button with their token selected. Omitting this will cause the button
        // to default to whichever character is active in the sandbox when the button is created
        /**/
        finishRoll(firstRoll.rollId);
    }


    const actions = ['', 'push', 'custom', 'strength', 'handtohand', 'force', 'stamina', 'agility', 'firearms', 'mobility', 'stealth', 
                    'intelligence', 'medicalaid', 'observation', 'tech', 'driving', 'empathy', 'connections', 'insight', 'manipulation',
                    'weapon1cc', 'weapon1rc', 'weapon2cc','weapon2rc', 'weapon3cc', 'weapon3rc',
                    'repeating_weapon:weaponcc', 'repeating_weapon:weaponrc'];
    const actionList = _.reduce(actions, (m,n) => {
        return m + "clicked:"+n+"roll clicked:"+n+"rolladv clicked:"+n+"rolldis ";
    });
    clog(actionList);


    // Sheet rolls handler
    on(actionList, async (ev) => {
        clog(`Starting first roll`);
        // We'll pretend we've done a getAttrs on the attacker's weapon for all the required values
        // Row ID's must be provided when using action buttons too, we'll skip all of that here though
        clog(`First event: ${JSON.stringify(ev)}`);
        //clog(`Event name: ${ev.htmlAttributes.name}`);  

        const rollAction = (ev.htmlAttributes.name).slice(4)||""; 
        var rollName = ev.htmlAttributes['data-name']||""; 
        const dieone = ev.htmlAttributes['data-die-one']||0; 
        const dieonesize = ev.htmlAttributes['data-die-one-size']||dieone; 
        const dietwo = ev.htmlAttributes['data-die-two']||0; 
        const dietwosize = ev.htmlAttributes['data-die-two-size']||dietwo; 
        const advtge = ev.htmlAttributes['data-adv']||0; 
        var comment = ev.htmlAttributes['data-comment']||""; 
        const push = ev.htmlAttributes['data-push']||0; 

        let sourceAttribute = ev.sourceAttribute||""; 
        clog(`Source attribute: ${sourceAttribute}`);
        if ( sourceAttribute.startsWith("repeating_") ) {
            let attributePrefix = sourceAttribute.slice(0, -13); 
            clog(`Repeating attribute: ${attributePrefix}`);
            const datarepeating = await asw.getAttrs([`${attributePrefix}_name`, `${attributePrefix}_comment`]);
            comment = datarepeating[`${attributePrefix}_comment`];
            rollName = datarepeating[`${attributePrefix}_name`];
        }

        clog(`Roll action: ${rollAction}, roll name: ${rollName}, Die 1: ${dieone}, Die 1 Size: ${dieonesize}, Die 2: ${dietwo}, Die 2 Size: ${dietwosize}, Push: ${push}, Advantage: ${advtge}`);

        //let modifiers = await getQuery(`?{Modifiers?|0}`);
        //const attrs = await asw.getAttrs(['customdieone','customdietwo']);
        //const dieone = int(attrs.customdieone),
        //    dietwo = int(attrs.customdietwo);

        parsedRoll(rollAction, rollName, dieone, dieone, dieonesize, dietwo, dietwo, dietwosize, push, comment, advtge);
    });

    
    // Pushed roll handler
    on('clicked:pushroll clicked:pushroll_1 clicked:pushroll_12 clicked:pushroll_13 clicked:pushroll_2 clicked:pushroll_23 clicked:pushroll_3 clicked:pushroll_123', async (ev) => {
        clog(`Starting push roll`);
        clog(`First event: ${JSON.stringify(ev)}`);
        clog(`Push type: ${(ev.triggerName).split('_')[1]}`);  
        const pushType = (ev.triggerName).split('_')[1];

        const pushedAttrs = await asw.getAttrs(["pushrollaction","pushrollname", "pushrollcomment", "pushdieone", "pushdietwo", "pushdieoneadv", "pushdietwoadv", "pushdieonesize", "pushdietwosize", "pushrolladv", "push", "pushdieoner1", "pushdieoner2", "pushdietwor1", "pushdietwor1"]);
        clog(`Pushed Attributes: ${JSON.stringify(pushedAttrs)}`);

        const rollAction = pushedAttrs.pushrollaction; 
        var rollName = pushedAttrs.pushrollname; 
        const dieone = pushedAttrs.pushdieone; 
        const dietwo = pushedAttrs.pushdietwo;
        const dieoneadv = pushedAttrs.pushdieoneadv; 
        const dietwoadv = pushedAttrs.pushdietwoadv;
        const dieonesize = pushedAttrs.pushdieonesize; 
        const dietwosize = pushedAttrs.pushdietwosize;  
        const dieoneres = pushedAttrs.pushdieoner1; 
        const dieoneadvres = pushedAttrs.pushdieoner2; 
        const dietwores = pushedAttrs.pushdietwor1; 
        const dietwoadvres = pushedAttrs.pushdietwor2;
        const advtge = pushedAttrs.pushrolladv; 
        var comment = pushedAttrs.pushrollcomment; 
        const push = pushedAttrs.push; 
        const advdie = int(dieonesize) <= int(dietwosize) ? 1 : 2; 

        clog(`Roll action: ${rollAction}, roll name: ${rollName}, Die 1: ${dieone}, Die 1 Size: ${dieonesize}, Die 2: ${dietwo}, Die 2 Size: ${dietwosize}, Push: ${push}, Advantage: ${advtge}`);

        switch (true) {
            case pushType === '1' : {
                    parsedRoll(rollAction, rollName, dieone, dieoneadvres, dieonesize, dietwores, dietwoadvres, dietwosize, push, comment, advtge);
                    break;
                }
            case pushType === '2' : {
                    parsedRoll(rollAction, rollName, dieoneres, dieoneadvres, dieonesize, dietwo, dietwoadvres, dietwosize, push, comment, advtge);
                    break;
                }
            case pushType === '3' && advdie === 1  : {
                    parsedRoll(rollAction, rollName, dieoneres, dieoneadv, dieonesize, dietwores, dietwoadvres, dietwosize, push, comment, advtge);
                    break;
                }
            case pushType === '3' && advdie === 2  : {
                    parsedRoll(rollAction, rollName, dieoneres, dieoneadvres, dieonesize, dietwores, dietwoadv, dietwosize, push, comment, advtge);
                    break;
                }
            case pushType === '12' : {
                    parsedRoll(rollAction, rollName, dieone, dieoneadvres, dieonesize, dietwo, dietwoadv, dietwosize, push, comment, advtge);
                    break;
                }
            case pushType === '13' && asvdie === 1  : {
                    parsedRoll(rollAction, rollName, dieone, dieoneadvr, dieonesize, dietwores, dietwoadvres, dietwosize, push, comment, advtge);
                    break;
                }
            case pushType === '13' && asvdie === 2  : {
                    parsedRoll(rollAction, rollName, dieone, dieoneadvres, dieonesize, dietwores, dietwoadv, dietwosize, push, comment, advtge);
                    break;
                }
            case pushType === '23' && asvdie === 1  : {
                    parsedRoll(rollAction, rollName, dieoneres, dieoneadv, dieonesize, dietwo, dietwoadvres, dietwosize, push, comment, advtge);
                    break;
                }
            case pushType === '23' && asvdie === 2  : {
                    parsedRoll(rollAction, rollName, dieoneres, dieoneadvres, dieonesize, dietwo, dietwoadv, dietwosize, push, comment, advtge);
                    break;
                }
            case pushType === '123' : {
                    parsedRoll(rollAction, rollName, dieone, dieoneadv, dieonesize, dietwo, dietwoadv, dietwosize, push, comment, advtge);
                    break;
                }
        }

        parsedRoll(rollAction, rollName, dieone, dieonesize, dietwo, dietwosize, push, comment, advtge);

    });