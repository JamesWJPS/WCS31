# PageMenuSidebar Component

A reusable, responsive sidebar component that displays hierarchical page navigation with support for both public and admin modes.

## Features

- **Hierarchical Menu Structure**: Displays nested pages with expandable/collapsible sections
- **Mobile-First Design**: Responsive layout optimized for mobile devices
- **Admin/Public Mode Support**: Different rendering based on authentication status
- **Real-time Updates**: Supports live content updates
- **Accessibility Compliant**: Full keyboard navigation and screen reader support
- **Authentication-Aware**: Shows admin-specific features when logged in

## Props Interface

```typescript
interface PageMenuSidebarProps {
  isAdminMode: boolean;                    // Whether to show admin features
  onPageSelect: (content: ContentItem) => void;  // Callback when page is selected
  selectedContentId?: string;             // Currently selected page ID
  showAdminControls?: boolean;            // Show edit/delete buttons
  contents?: ContentItem[];               // Array of content items
  loading?: boolean;                      // Show loading state
  onEditContent?: (content: ContentItem) => void;    // Edit callback
  onDeleteContent?: (content: ContentItem) => void;  // Delete callback
}
```

## ContentItem Interface

```typescript
interface ContentItem {
  id: string;
  title: string;
  slug?: string;
  menu_title?: string;        // Override title for menu display
  parent_id?: string | null;  // Parent page ID for hierarchy
  menu_order?: number;        // Sort order within level
  show_in_menu?: boolean | number;  // Whether to show in menu
  status?: 'draft' | 'published' | 'archived';
  updated_at?: string;
  children?: ContentItem[];   // Populated by component
}
```

## Usage Examples

### Basic Public Mode

```tsx
import PageMenuSidebar from './components/layout/PageMenuSidebar';

const MyComponent = () => {
  const [selectedId, setSelectedId] = useState<string>();
  
  const handlePageSelect = (content: ContentItem) => {
    setSelectedId(content.id);
    // Handle navigation
  };

  return (
    <PageMenuSidebar
      isAdminMode={false}
      onPageSelect={handlePageSelect}
      selectedContentId={selectedId}
      contents={contentItems}
    />
  );
};
```

### Admin Mode with Controls

```tsx
const AdminComponent = () => {
  const handleEdit = (content: ContentItem) => {
    // Open edit modal/page
  };

  const handleDelete = (content: ContentItem) => {
    // Confirm and delete
  };

  return (
    <PageMenuSidebar
      isAdminMode={true}
      onPageSelect={handlePageSelect}
      selectedContentId={selectedId}
      showAdminControls={true}
      contents={contentItems}
      onEditContent={handleEdit}
      onDeleteContent={handleDelete}
    />
  );
};
```

### Loading State

```tsx
<PageMenuSidebar
  isAdminMode={false}
  onPageSelect={handlePageSelect}
  loading={true}
/>
```

## Features by Mode

### Public Mode
- Clean menu display with page titles
- Last updated dates
- Hierarchical navigation
- Admin login link
- Mobile-optimized touch interactions

### Admin Mode
- All public mode features plus:
- Draft/Hidden status badges
- Edit/Delete buttons on hover
- Admin mode indicator
- Enhanced visual indicators

## Responsive Design

The component uses a mobile-first approach:

- **Mobile (< 768px)**: Compact layout, always-visible admin controls
- **Tablet (768px - 992px)**: Medium spacing, hover interactions
- **Desktop (> 992px)**: Full spacing, advanced hover states
- **Large Desktop (> 1200px)**: Maximum width constraints

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support with proper focus management
- **Screen Reader Support**: ARIA labels, roles, and live regions
- **High Contrast Mode**: Enhanced visibility in high contrast mode
- **Reduced Motion**: Respects user's motion preferences
- **Focus Indicators**: Clear focus outlines for all interactive elements

## CSS Classes

The component uses BEM-style CSS classes:

```css
.page-menu-sidebar          /* Main container */
.page-menu-header           /* Header section */
.page-menu-nav              /* Navigation container */
.page-menu-list             /* Menu list container */
.page-menu-item             /* Individual menu item */
.page-menu-button           /* Clickable menu button */
.page-menu-content          /* Button content wrapper */
.page-menu-title            /* Title section */
.page-menu-children         /* Child items container */
.admin-indicators           /* Admin status badges */
.admin-controls             /* Edit/delete buttons */
.admin-login-section        /* Login link section */
```

## Integration with Existing Code

### Replacing Existing Menu Logic

The component is designed to replace existing inline menu rendering:

```tsx
// BEFORE: Inline menu logic
const buildMenuTree = (contents) => { /* ... */ };
const renderMenuItem = (item, level) => { /* ... */ };

return (
  <div className="sidebar">
    {buildMenuTree(contents).map(item => renderMenuItem(item))}
  </div>
);

// AFTER: Using PageMenuSidebar
return (
  <PageMenuSidebar
    isAdminMode={isAdmin}
    onPageSelect={handlePageSelect}
    contents={contents}
    selectedContentId={selectedId}
  />
);
```

### URL Hash Navigation

The component automatically updates the URL hash when pages are selected:

```tsx
const handlePageSelect = (content: ContentItem) => {
  setSelectedContent(content);
  // Hash is automatically updated by the component
  // window.location.hash = content.slug || content.id;
};
```

## Testing

The component includes comprehensive tests covering:

- Basic rendering in all states
- Hierarchical menu structure
- Expand/collapse functionality
- Page selection
- Admin mode features
- Accessibility compliance
- Mobile responsiveness

Run tests with:
```bash
npm test PageMenuSidebar
```

## Performance Considerations

- **Memoization**: Menu items are memoized to prevent unnecessary re-renders
- **Virtual Scrolling**: Ready for implementation with large menu hierarchies
- **Debounced Updates**: Batches rapid content changes
- **Lazy Loading**: Children are only rendered when expanded

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Screen readers (NVDA, JAWS, VoiceOver)

## Migration Guide

### From Existing PublicContentDisplay

1. **Extract menu data**: Ensure content items have required menu properties
2. **Replace menu rendering**: Remove inline `buildMenuTree` and `renderMenuItem`
3. **Add component**: Import and use `PageMenuSidebar`
4. **Update handlers**: Implement `onPageSelect` callback
5. **Test functionality**: Verify navigation and selection work correctly

### Required Content Properties

Ensure your content items include these menu-related properties:

```typescript
{
  menu_title?: string,      // Optional shorter title for menu
  parent_id?: string,       // For hierarchical structure
  menu_order?: number,      // Sort order (default: 0)
  show_in_menu?: boolean,   // Visibility in menu (default: true)
}
```

## Customization

### Styling

Override CSS custom properties for theming:

```css
.page-menu-sidebar {
  --menu-bg-color: #ffffff;
  --menu-text-color: #333333;
  --menu-hover-color: #f8f9fa;
  --menu-selected-color: #e7f3ff;
  --menu-border-color: #e9ecef;
}
```

### Behavior

Customize behavior through props:

```tsx
<PageMenuSidebar
  isAdminMode={isAdmin}
  showAdminControls={hasEditPermission}
  onPageSelect={customPageHandler}
  onEditContent={customEditHandler}
  onDeleteContent={customDeleteHandler}
/>
```

## Troubleshooting

### Common Issues

1. **Menu not expanding**: Check that `parent_id` relationships are correct
2. **Items not showing**: Verify `show_in_menu` is true
3. **Wrong order**: Check `menu_order` values
4. **Admin controls not visible**: Ensure `showAdminControls` is true and handlers are provided

### Debug Mode

Enable debug logging:

```tsx
// Add to component props for debugging
onPageSelect={(content) => {
  console.log('Page selected:', content);
  handlePageSelect(content);
}}
```