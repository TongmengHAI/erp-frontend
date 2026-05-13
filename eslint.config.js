import js from '@eslint/js';
import vuePlugin from 'eslint-plugin-vue';
import vueTsConfig from '@vue/eslint-config-typescript';

export default [
    js.configs.recommended,
    ...vuePlugin.configs['flat/recommended'],
    ...vueTsConfig(),
    {
        files: ['**/*.{ts,tsx,vue}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'vue/multi-word-component-names': 'off',
            // Formatting is owned by Prettier (.prettierrc). Turn off the
            // stylistic vue/* rules that clash with 4-space indent + the
            // project's wrapping style — keep ESLint focused on real bugs.
            'vue/html-indent': 'off',
            'vue/html-self-closing': 'off',
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
    },
];
