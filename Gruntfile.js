module.exports = function (grunt) {

    grunt.initConfig(
        {
            jasmine_node: {
                options: {
                    specFolders:['spec/'],
                    forceExit: true,
                    match: '.',
                    matchall: false,
                    extensions: 'js',
                    specNameMatcher: 'Spec',
                    summary: true
                },
                all: []
            },
            jshint: {
                options: {
                    jshintrc: true
                },
                all: ['Gruntfile.js', 'index.js', 'lib/**/*.js', 'spec/**/*.js']
            }
        });


    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jasmine-node');

    grunt.registerTask('test', ['jasmine_node']);
    grunt.registerTask('default', ['jshint', 'jasmine_node']);

};
