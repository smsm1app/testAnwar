import { test, expect } from '@playwright/test';

test.describe('Navigation & Error Audit', () => {
  // Define all the sidebar links to navigate to
  const routes = [
    { name: 'Dashboard', path: '/' },
    { name: 'POS', path: '/pos' },
    { name: 'Customers', path: '/customers' },
    { name: 'Invoices', path: '/invoices' },
    { name: 'Products', path: '/products' },
    { name: 'Contracts', path: '/contracts' },
    { name: 'Installments', path: '/installments' },
    { name: 'Maintenance', path: '/maintenance' },
    { name: 'Faults', path: '/faults' },
    { name: 'Installations', path: '/installations' },
    { name: 'BankSettlement', path: '/bank' },
    { name: 'Reports', path: '/reports' },
    { name: 'Employees', path: '/employees' },
    { name: 'Settings', path: '/settings' }
  ];

  for (const route of routes) {
    test(`Navigate to ${route.name} and check for console/network errors`, async ({ page }) => {
      const errors: string[] = [];
      const failedRequests: string[] = [];

      // Monitor console for errors (excluding predictable warnings or dev tools notes)
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('React DevTools') && !text.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')) {
            errors.push(text);
          }
        }
      });

      // Monitor network for 404/500 errors
      page.on('response', response => {
        if (response.status() >= 400 && response.status() !== 403) {
          failedRequests.push(`[${response.status()}] ${response.url()}`);
        }
      });

      // Go to the route
      await page.goto(route.path);
      
      // Wait for network idle to ensure data loads
      await page.waitForLoadState('networkidle');
      
      // Verify no unexpected network errors
      expect(failedRequests, `Found failed network requests on ${route.name}`).toEqual([]);
      
      // Verify no console errors
      expect(errors, `Found console errors on ${route.name}`).toEqual([]);
    });
  }
});
