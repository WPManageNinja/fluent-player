import { describe, expect, it } from 'vitest';
import { waitsForIntegrationData } from '../../resources/js/utils/inlineConfig.js';

describe('waitsForIntegrationData', () => {
    it('waits for Fluent Community-managed players', () => {
        const container = {
            dataset: {
                flpRef: 'fcom_42',
            },
        };

        expect(waitsForIntegrationData(container)).toBe(true);
    });

    it('keeps the fallback enabled for normal Fluent Player embeds', () => {
        const container = {
            dataset: {
                flpRef: 'fpm_42_1',
            },
        };

        expect(waitsForIntegrationData(container)).toBe(false);
        expect(waitsForIntegrationData(null)).toBe(false);
    });
});
