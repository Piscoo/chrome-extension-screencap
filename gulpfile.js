var gulp = require('gulp');
var sass = require('gulp-sass');

var paths = {
  sass: ['scss/**/*.scss'],
  html: ['src/*.html'],
  js: ['src/js/**/*.js'],
  img: ['src/img/**/*'],
};

gulp.task('sass', () => {
  return gulp.src(paths.sass).pipe(sass()).pipe(gulp.dest('css'));
});

gulp.task('watch', () => {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('default', ['watch', 'sass']);
