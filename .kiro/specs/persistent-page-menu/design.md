# Design Document

## Overview

This design implements a persistent page menu system that provides consistent navigation regardless of user authentication status. The solution maintains the existing public content display structure while enhancing the admin interface to include the same menu navigation alongside administrative tools.

## Architecture

### Current State Analysis

The current application has two distinct interfaces:
- **Public Interface**: `PublicContentDisplay` component with sidebar menu navigation
- **Admin Interface**: `Dashboard` component with tabbed admin tools

### Proposed Architecture

The new architecture will:
1. **Unify Menu Component**: Extract the page menu logic into a reusable `PageMenuSidebar` component
2. **Enhance Admin Layout**: Modify the admin interface to include the page menu alongside admin tools
3. **Context-Aware Rendering**: Add authentication-aware rendering for admin-specific features within the menu
4. **Real-time Updates**: Implement live menu updates when content changes occur

## Components and Interfaces

### 1. PageMenuSidebar Component

**Purpose**: Reusable sidebar component that displays the hierarchical page menu

**Props Interface**:
```typescript
interface PageMenuSidebarProps {
  isAdminMode: boolean;
  onPageSelect: (content: any) => void;
  selectedContentId?: string;
  showAdminControls?: boolean;
}
```

**Key Features**:
- Hierarchical menu rendering with nested structure
- Real-time content updates via API polling or WebSocket
- Admin-specific visual indicators (draft badges, hidden page markers)
- Context menu for admin actions (edit, delete, reorder)

### 2. Enhanced Admin Layout

**Structure**:
```
┌─────────────────────────────────────────┐
│ Navigation Bar (existing)               │
├─────────────┬───────────────────────────┤
│ Page Menu   │ Admin Content Area        │
│ Sidebar     │                           │
│             │ ┌─────────────────────────┤
│ - Home      │ │ Admin Tabs              │
│ - About     │ │ [Content][Docs][Users]  │
│ - Services  │ │                         │
│   - Web     │ │ Tab Content Area        │
│   - Mobile  │ │                         │
│ - Contact   │ │                         │
│             │ │                         │
│ [Admin      │ │                         │
│  Login]     │ │                         │
└─────────────┴───────────────────────────┘
```

### 3. Content Display Integration

**Dual-Mode Content Display**:
- **Public Mode**: Full-width content display (existing behavior)
- **Admin Mode**: Content display within admin interface with edit controls

### 4. Admin Control Integration

**Menu Item Enhancement**:
Each menu item in admin mode will include:
- Visual status indicators (published/draft/hidden)
- Hover controls for quick actions
- Context menu for advanced operations
- Drag handles for reordering (when in organize mode)

### 5. Content Manager Integration

**Menu Management Access**:
The Content Manager page will include:
- "Manage Menu Order" button in the page header
- Integration with existing DragDropMenuManager component
- Automatic content list refresh after menu changes
- Consistent UI patterns with existing admin interface

## Data Models

### Enhanced Content Model

The existing content model supports the required fields:
- `status`: 'published' | 'draft'
- `show_in_menu`: boolean
- `menu_title`: string (optional override)
- `parent_id`: string (for hierarchy)
- `menu_order`: number (for sorting)

### Menu State Model

```typescript
interface MenuState {
  contents: ContentItem[];
  selectedContentId: string | null;
  isLoading: boolean;
  lastUpdated: Date;
}
```

## Error Handling

### API Failure Scenarios

1. **Content Loading Failure**:
   - Display cached menu if available
   - Show error indicator with retry option
   - Graceful degradation to basic navigation

2. **Real-time Update Failure**:
   - Fall back to periodic polling
   - Show "outdated" indicator
   - Manual refresh option

3. **Admin Action Failure**:
   - Rollback optimistic updates
   - Display error messages
   - Retry mechanisms for critical operations

### User Experience Considerations

- Loading states for menu updates
- Optimistic updates for immediate feedback
- Conflict resolution for concurrent edits
- Offline capability with sync on reconnection

## Testing Strategy

### Unit Tests

1. **PageMenuSidebar Component**:
   - Menu rendering with various content structures
   - Admin vs public mode rendering differences
   - Event handling (selection, admin actions)
   - Real-time update integration

2. **Menu State Management**:
   - Content loading and caching
   - Update propagation
   - Error state handling

### Integration Tests

1. **Admin Workflow Tests**:
   - Content creation → menu update
   - Content reordering → menu reflection
   - Status changes → visibility updates

2. **Public/Admin Mode Switching**:
   - Login/logout menu consistency
   - Admin control visibility
   - Content access permissions

### End-to-End Tests

1. **User Journey Tests**:
   - Public visitor navigation experience
   - Admin content management with live menu
   - Cross-browser compatibility
   - Mobile responsiveness

2. **Performance Tests**:
   - Large menu hierarchy rendering
   - Real-time update performance
   - Memory usage with long sessions

## Implementation Phases

### Phase 1: Component Extraction
- Extract `PageMenuSidebar` from `PublicContentDisplay`
- Create shared interfaces and types
- Implement basic admin/public mode switching

### Phase 2: Admin Integration
- Modify `Dashboard` layout to include sidebar
- Add admin-specific menu features
- Implement context-aware rendering

### Phase 3: Real-time Updates
- Add live content updates to menu
- Implement optimistic updates
- Add error handling and recovery

### Phase 4: Content Manager Integration
- Integrate drag-and-drop menu manager into Content Manager page
- Add menu management button to content management interface
- Connect menu updates with content refresh functionality

### Phase 5: Enhanced Admin Features
- Add inline editing capabilities
- Add bulk operations support
- Implement advanced menu organization features

## Technical Considerations

### Performance Optimizations

- **Memoization**: Use React.memo for menu items to prevent unnecessary re-renders
- **Virtual Scrolling**: For large menu hierarchies (future consideration)
- **Debounced Updates**: Batch rapid content changes

### Accessibility

- **Keyboard Navigation**: Full keyboard support for menu navigation
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Logical focus flow in admin mode

### Mobile Responsiveness

- **Collapsible Sidebar**: Mobile-friendly menu collapse
- **Touch Interactions**: Optimized for touch devices
- **Responsive Layout**: Adaptive admin interface layout