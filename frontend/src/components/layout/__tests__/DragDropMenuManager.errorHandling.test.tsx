import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DragDropMenuManager from '../DragDropMenuManager';
import { ContentItem } from '../../../types';

// Mock data for error handling tests
const mockContents: ContentItem[] = [
    {
        id: '1',
        title: 'Home',
        slug: 'home',
        content: 'Home content',
        status: 'published',
        show_in_menu: 1,
        menu_order: 0,
        parent_id: null,
        created_at: '2024-01-01',
        updated_at: 