import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme/theme';
import Home from './pages/Home';
import CreateRecipe from './pages/CreateRecipe';
import RecipesList from './pages/RecipesList';
import CookingSession from './pages/CookingSession';
import MiniPlayer from './components/MiniPlayer';
import './App.css';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipes" element={<RecipesList />} />
          <Route path="/create" element={<CreateRecipe />} />
          <Route path="/cook/:id" element={<CookingSession />} />
        </Routes>
        <MiniPlayer />
      </Router>
    </ThemeProvider>
  );
}

export default App;
