/*
 * Copyright 2016 Palantir Technologies, Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 - http://www.apache.org/licenses/LICENSE-2.0
 */
import * as React from "react";

import BaseExample from "./baseExample";

import { KeyCombo, getKeyComboString } from "@blueprint/core";

interface IHotkeyPianoState {
    combo: string;
}

export class HotkeyTester extends BaseExample<IHotkeyPianoState> {
    public state = {
        combo: null as string,
    };

    protected renderExample() {
        return <div
            className="hotkey-tester-example"
            onKeyDown={this.handleKeyDown}
            tabIndex={0}
        >
            {this.renderKeyCombo()}
        </div>;
    }

    private renderKeyCombo(): React.ReactNode {
        const { combo } = this.state;
        if (combo == null) {
            return "Click here then press a key combo";
        } else {
            return <div><KeyCombo combo={combo} /> or <code>{combo}</code></div>;
        }
    }

    private handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const combo = getKeyComboString(e.nativeEvent as KeyboardEvent);
        this.setState({ combo });
    }
}
