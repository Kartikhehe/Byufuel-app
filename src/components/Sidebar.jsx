import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  IconButton,
  Backdrop,
  useTheme,
} from '@mui/material';
import {
  AddLocationAltOutlined as AddLocationAltOutlinedIcon,
  BookmarkAddedOutlined as BookmarkAddedOutlinedIcon,
  LocalShipping as LocalShippingIcon,
  Restaurant as RestaurantIcon,
  Route as RouteIcon,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';

// Responsive drawer widths (87.5% of original, increased for mobile)
const drawerWidth = { xs: '18rem', sm: '14.21875rem', md: '15.3125rem' };
const drawerCollapsedWidth = { xs: '3.0625rem', sm: '3.5rem' };

function Sidebar({ sidebarOpen, onToggle, isMobile, onMenuItemClick }) {
  const theme = useTheme();
  const menuItems = [
    { text: 'Add Warehouse', icon: <AddLocationAltOutlinedIcon />, action: () => onMenuItemClick('Add Warehouse') },
    { text: 'Warehouses', icon: <BookmarkAddedOutlinedIcon />, action: () => onMenuItemClick('Warehouses') },
    { text: 'View Fleets', icon: <LocalShippingIcon />, action: () => onMenuItemClick('View Fleets') },
    { text: 'Restaurants', icon: <RestaurantIcon />, action: () => onMenuItemClick('Restaurants') },
    { text: 'Optimize Route', icon: <RouteIcon />, action: () => onMenuItemClick('Optimize Route') },
  ];

  return (
    <>
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={isMobile ? sidebarOpen : true}
        onClose={isMobile ? onToggle : undefined}
        ModalProps={{
          keepMounted: true,
          BackdropProps: {
            sx: { zIndex: (theme) => theme.zIndex.modal + 18 },
          },
          sx: { zIndex: (theme) => theme.zIndex.modal + 20 },
        }}
        PaperProps={{
          square: true,
          sx: {
            zIndex: (theme) => (isMobile ? theme.zIndex.modal + 21 : theme.zIndex.drawer),
            borderRadius: 0,
          },
        }}
        sx={(theme) => ({
          width: sidebarOpen
            ? { xs: drawerWidth.xs, sm: drawerWidth.sm, md: drawerWidth.md }
            : { xs: drawerCollapsedWidth.xs, sm: drawerCollapsedWidth.sm },
          flexShrink: 0,
          whiteSpace: 'nowrap',
          '& .MuiDrawer-paper': {
            width: isMobile
              ? drawerWidth.xs
              : sidebarOpen
                ? { xs: drawerWidth.xs, sm: drawerWidth.sm, md: drawerWidth.md }
                : { xs: drawerCollapsedWidth.xs, sm: drawerCollapsedWidth.sm },
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            top: { xs: '4.5rem', sm: '3.5rem' },
            height: { xs: 'calc(100vh - 4.5rem)', sm: 'calc(100vh - 3.5rem)' },
            position: 'fixed',
            left: 0,
            zIndex: isMobile ? theme.zIndex.drawer + 20 : theme.zIndex.drawer,
          },
        })}
      >
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'flex-end' : 'center',
            padding: { xs: theme.spacing(0, 0.65625), sm: theme.spacing(0, 0.875) },
            minHeight: { xs: '4.5rem', sm: '3.5rem' },
            borderBottom: `1px solid ${theme.palette.divider}`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            backgroundColor: theme.palette.background.paper,
          })}
        >
          <IconButton
            onClick={onToggle}
            sx={{
              color: theme.palette.text.secondary,
              backgroundColor: theme.palette.action.hover,
              borderRadius: '50%',
              width: { xs: '3.5rem', sm: '2.1875rem' },
              height: { xs: '3.5rem', sm: '2.1875rem' },
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? '#3a3a3a' : '#e0e0e0',
              },
              '& .MuiSvgIcon-root': {
                fontSize: { xs: '2rem', sm: '1.25rem' },
              },
            }}
            size="small"
          >
            {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </Box>
        <List sx={{ pt: { xs: '3.9375rem', sm: '4.375rem' } }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip
                title={item.text}
                placement="right"
                arrow
                disableHoverListener={sidebarOpen}
              >
                <ListItemButton
                  onClick={() => {
                    item.action();
                    if (isMobile) {
                      onToggle();
                    }
                  }}
                  sx={{
                    mx: { xs: 0.65625, sm: 0.875 },
                    borderRadius: { xs: 0, sm: '0.765625rem', md: '0.875rem' },
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    minHeight: { xs: '3.75rem', sm: '2.625rem' },
                    py: { xs: 1.25, sm: 0.5 },
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.action.selected,
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(76, 175, 80, 0.24)'
                          : '#C8E6C9',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: sidebarOpen ? '#4CAF50' : theme.palette.text.secondary,
                      minWidth: sidebarOpen ? { xs: '2.75rem', sm: '2.1875rem' } : 'auto',
                      justifyContent: 'center',
                      '& .Mui-selected': {
                        color: '#4CAF50',
                      },
                      '& .MuiSvgIcon-root': {
                        fontSize: { xs: '1.75rem', sm: '1.25rem' },
                      },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {sidebarOpen && (
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        fontSize: { xs: '1.125rem', sm: '0.8rem', md: '0.83125rem' },
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );
}

export default Sidebar;

