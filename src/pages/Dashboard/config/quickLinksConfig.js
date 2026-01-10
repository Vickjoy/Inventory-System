// Quick Links Configuration
// Centralized configuration for dashboard stat cards
// Can be customized based on user role or permissions

export const quickLinksConfig = (stats, navigate) => [
    {
      title: 'Total Products',
      value: stats?.total_products || 0,
      hasValue: true,
      onClick: () => navigate('/products'),
      ariaLabel: 'View all products'
    },
    {
      title: 'Low Stock',
      value: stats?.low_stock_items || 0,
      hasValue: true,
      onClick: () => navigate('/products?filter=low'),
      ariaLabel: 'View low stock items',
      isAlert: true
    },
    {
      title: 'Outstanding Supplies',
      value: stats?.outstanding_invoices || 0,
      hasValue: true,
      onClick: () => navigate('/outstanding-supplies'),
      ariaLabel: 'View outstanding supplies'
    },
    {
      title: 'Sales',
      hasValue: false,
      onClick: () => navigate('/sales'),
      ariaLabel: 'Go to sales page'
    },
    {
      title: 'Stock In/Out',
      hasValue: false,
      onClick: () => navigate('/stock-entries'),
      ariaLabel: 'Go to stock entries page'
    },
    {
      title: 'Reports & Analytics',
      hasValue: false,
      onClick: () => navigate('/reports'),
      ariaLabel: 'Go to reports and analytics page'
    }
  ];
  
  // Role-based configuration (example for future use)
  export const getRoleBasedQuickLinks = (role, stats, navigate) => {
    const allLinks = quickLinksConfig(stats, navigate);
    
    // Example: Filter links based on role
    if (role === 'viewer') {
      return allLinks.filter(link => 
        !['Outstanding Supplies', 'Stock In/Out'].includes(link.title)
      );
    }
    
    return allLinks;
  };