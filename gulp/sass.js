/*
 * Copyright 2015 Palantir Technologies, Inc. All rights reserved.
 */
"use strict";

module.exports = (gulp, plugins, blueprint) => {
    const path = require("path");
    const COPYRIGHT_HEADER = require("./util/text").COPYRIGHT_HEADER;

    const blueprintCwd = blueprint.findProject("core").cwd;

    const config = {
        dests: ["build/src", "build/global"],

        autoprefixer: {
            browsers: ["Chrome >= 37", "Explorer >= 9", "Firefox >= 24", "iOS >= 7", "Safari >= 7"],
        },

        linter: (project, isDevMode) => ({
            failAfterError: !isDevMode,
            reporters: [
                { formatter: "string", console: true },
            ],
            syntax: "scss",
        }),

        srcGlob: (project, excludePartials) => {
            return path.join(project.cwd, "src/**/", `${excludePartials ? "!(_)" : ""}*.scss`);
        },

        // source files to concatenate and export as `variables.{scss,less}`
        variables: [
            `${blueprintCwd}/src/common/_colors.scss`,
            `${blueprintCwd}/src/common/_color-aliases.scss`,
            `${blueprintCwd}/src/common/_variables.scss`,
            `${blueprintCwd}/src/generated/_icon-variables.scss`,
        ],
    };

    blueprint.task("sass", "lint", [], (project, isDevMode) => (
        gulp.src(config.srcGlob(project))
            .pipe(plugins.stylelint(config.linter(project, isDevMode)))
            .pipe(plugins.count(`${project.id}: ## stylesheets linted`))
    ));

    blueprint.task("sass", "compile", [], (project, isDevMode) => {
        const sassCompiler = plugins.sass();
        if (isDevMode) {
            sassCompiler.on("error", plugins.sass.logError);
        }

        let stream = gulp.src(config.srcGlob(project, true))
            .pipe(plugins.sourcemaps.init())
            .pipe(sassCompiler)
            .pipe(plugins.autoprefixer(config.autoprefixer))
            .pipe(plugins.stripCssComments({ preserve: /^\*/ }))
            .pipe(plugins.replace(/\n{3,}/g, "\n\n"))
            // see https://github.com/floridoo/vinyl-sourcemaps-apply/issues/11#issuecomment-231220574
            .pipe(plugins.sourcemaps.write(undefined, { sourceRoot: null }));

        // allow project to override destination directories
        (project.sass.dests || config.dests).forEach((dest) => {
            stream = stream.pipe(gulp.dest(path.join(project.cwd, dest)));
        });
        return stream.pipe(plugins.connect.reload());
    });

    // concatenate all sass variables files together into one single exported list of variables
    gulp.task("sass-variables", ["icons"], () => {
        var mainProject = blueprint.findProject("core");
        var dest1 = `${mainProject.cwd}/build/src`;
        var dest2 = `${mainProject.cwd}/build/global`;

        return gulp.src(config.variables)
            .pipe(plugins.concat("variables.scss"))
            // package the variables list for consumption -- no imports or functions
            .pipe(plugins.stripCssComments())
            .pipe(plugins.replace(/\n{3,}/g, "\n\n"))
            .pipe(plugins.replace(/(@import|\/\/).*\n+/g, ""))
            .pipe(plugins.replace(/border-shadow\((.+)\)/g, "0 0 0 1px rgba($black, $1)"))
            .pipe(plugins.replace(/\n{3,}/g, "\n\n"))
            .pipe(plugins.insert.prepend(COPYRIGHT_HEADER))
            .pipe(gulp.dest(dest1))
            .pipe(gulp.dest(dest2))
            // convert scss to less
            .pipe(plugins.replace(/rgba\((\$[\w-]+), ([\d\.]+)\)/g,
                                  (match, color, opacity) => `fade(${color}, ${+opacity * 100}%)`))
            .pipe(plugins.replace(/rgba\((\$[\w-]+), (\$[\w-]+)\)/g,
                                  (match, color, variable) => `fade(${color}, ${variable} * 100%)`))
            .pipe(plugins.replace(/\$/g, "@"))
            .pipe(plugins.rename("variables.less"))
            .pipe(gulp.dest(dest1))
            .pipe(gulp.dest(dest2))
            // run it through less compiler (after writing files) to ensure we converted correctly
            .pipe(plugins.less());
    });

    gulp.task("sass", ["sass-lint", "sass-compile"]);

    blueprint.task("sass", "watch", (project) => {
        // compute watch dependencies (this task has no body)
        const sassDeps = [`sass-compile-w-${project.id}`];
        if (project.id !== "docs") {
            // docs project does not need these dependencies
            sassDeps.push("sass-variables", "docs-kss");
        }
        return sassDeps;
    }, () => {});
};
