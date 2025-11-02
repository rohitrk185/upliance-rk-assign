import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useAppSelector } from '../store/hooks';

function Home() {
  const navigate = useNavigate();
  const session = useAppSelector((state) => state.session);
  
  // Check if mini player is visible
  const hasMiniPlayer = !!session.activeRecipeId;

  return (
    <Container 
      maxWidth="md" 
      sx={{ 
        mt: 8, 
        mb: 4,
        pb: hasMiniPlayer ? 12 : 4, // extra bottom padding when mini player is visible
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Recipe Builder
        </Typography>
        <Typography variant="h5" component="h2" color="text.secondary">
          Welcome!
        </Typography>
      </Box>

      <List sx={{ bgcolor: 'background.paper' }}>
        <ListItem
          disablePadding
          sx={{
            border: 1.5,
            borderColor: 'divider',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <ListItemButton onClick={() => navigate('/recipes')}>
            <ListItemIcon>
              <RestaurantMenuIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="View Recipes"
              secondary="Browse, filter, and manage your saved recipes"
            />
          </ListItemButton>
        </ListItem>

        <ListItem
          disablePadding
          sx={{
            border: 1.5,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <ListItemButton onClick={() => navigate('/create')}>
            <ListItemIcon>
              <AddCircleOutlineIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Create Recipe"
              secondary="Build a new recipe with ingredients and cooking steps"
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Container>
  );
}

export default Home;

