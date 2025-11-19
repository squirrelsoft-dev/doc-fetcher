# Doc Fetcher Tests

This directory contains the test suite for the doc-fetcher plugin.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual modules
│   ├── utils.test.js       # Tests for utility functions
│   ├── robots-checker.test.js  # Tests for robots.txt handling
│   └── detect-dependencies.test.js  # Tests for dependency detection
├── integration/             # Integration tests (to be added)
└── fixtures/                # Test fixtures and sample data
    ├── package.json        # Sample JavaScript project
    └── requirements.txt    # Sample Python project
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Current Test Coverage

### ✅ Fully Tested Modules

- **utils.js** (~53% coverage)
  - Formatting functions (formatBytes, formatRelativeTime, prettyJson)
  - Filename sanitization
  - URL utilities (extractDomain, normalizeUrl, isAbsoluteUrl, resolveUrl)
  - Path utilities (getCacheDir, getLibraryPath)
  - ProgressBar class

- **robots-checker.js** (~16% coverage)
  - Constructor and configuration modes
  - Domain extraction
  - Default behaviors (when disabled or not initialized)
  - Cache path generation

- **Dependency Detection** (tested via fixtures)
  - Library name normalization
  - JavaScript/TypeScript dependency parsing
  - Python dependency parsing
  - Version extraction and formatting

### 📝 To Be Added

- **Integration Tests**
  - End-to-end fetch-docs pipeline
  - llms.txt discovery flow
  - Sitemap parsing and content extraction
  - Skill generation workflow

- **Additional Unit Tests**
  - extract-content.js (HTML parsing, framework detection)
  - fetch-docs.js (orchestration logic)
  - find-llms-txt.js (discovery logic)
  - parse-sitemap.js (XML parsing)
  - generate-skill.js (template generation)
  - update-docs.js (update logic)
  - list-docs.js (formatting logic)

## Test Guidelines

### Writing Tests

1. Use the `@jest/globals` import style for ES modules:
   ```javascript
   import { describe, it, expect } from '@jest/globals';
   ```

2. Organize tests with clear describe blocks:
   ```javascript
   describe('Module Name', () => {
     describe('Function Name', () => {
       it('should do something specific', () => {
         // Test implementation
       });
     });
   });
   ```

3. Use descriptive test names that explain the expected behavior
4. Keep tests focused on a single behavior or outcome
5. Add fixtures to `tests/fixtures/` for reusable test data

### Testing ES Modules

This project uses ES modules (`"type": "module"` in package.json). Jest requires special configuration:

- Tests run with `--experimental-vm-modules` flag
- No transform is applied (native ES module support)
- Import statements use `.js` extensions

### Mocking Considerations

Complex mocking of ES modules in Jest is challenging. For now:
- Test pure functions without mocks
- Test classes with minimal external dependencies
- Integration tests can use real dependencies
- Avoid unstable_mockModule for now (requires more setup)

## Coverage Goals

### Current Coverage
- **Statements**: ~9%
- **Branches**: ~8%
- **Functions**: ~21%
- **Lines**: ~9%

### Target Coverage (Phase 1)
- **Statements**: 50%
- **Branches**: 40%
- **Functions**: 50%
- **Lines**: 50%

### High-Value Test Areas
1. Core utility functions (formatBytes, sanitizeFilename, URL helpers)
2. Dependency detection and parsing
3. Robots.txt compliance logic
4. Configuration loading and validation
5. Error handling and recovery logic

## Contributing

When adding new features:
1. Write tests first (TDD) or alongside implementation
2. Ensure all tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Add fixtures for common test scenarios
5. Document complex test setups

## Known Issues

- ES module mocking is limited (using unstable Jest features)
- Integration tests not yet implemented
- Some modules (fetch-docs, parse-sitemap) have 0% coverage
- Coverage thresholds set low temporarily (will increase as tests are added)

## Next Steps

1. Add integration tests for main workflows
2. Increase unit test coverage to 50%+
3. Add E2E tests for CLI commands
4. Set up CI/CD testing pipeline
5. Add performance benchmarks
