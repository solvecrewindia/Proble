import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page by default', () => {
    render(<App />);
    const linkElement = screen.getByText(/Faculty Portal Access/i);
    expect(linkElement).toBeInTheDocument();
});
