import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/scripts/**']
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'test-results/vitest-report.xml'
    }
  }
});
