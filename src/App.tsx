import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme/theme';
import Home from './pages/Home';
import './App.css';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipes" element={<div>Recipes List - Coming Soon</div>} />
          <Route path="/create" element={<div>Create Recipe - Coming Soon</div>} />
          <Route path="/cook/:id" element={<div>Cooking Session - Coming Soon</div>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
