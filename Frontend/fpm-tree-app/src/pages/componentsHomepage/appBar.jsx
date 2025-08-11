import * as React from 'react';

import {
    ThemeProvider,
    createTheme,
    alpha
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import AppBar from '@mui/material/AppBar';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';

import {

    Link,

} from '@mui/material';

// Ícones
import GitHubIcon from '@mui/icons-material/GitHub';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ScienceIcon from '@mui/icons-material/Science';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Logo from './logo';


const navLinks = [
    { label: 'Highlights', href: '#highlights' },
    { label: 'About Us', href: '#sobre' },
    { label: 'FAQ', href: '#faq' },
];

const AppAppBar = ({ mode, toggleColorMode }) => {
    const navigate = useNavigate();

    const handleStartWorking = () => {
        navigate('/Dashboards');
    };

    return (
        <AppBar
            position="fixed"
            sx={{
                boxShadow: 0,
                bgcolor: 'transparent',
                backgroundImage: 'none',
                mt: 2,
            }}
        >
            <Container style={{ maxWidth: '80vw' }}>
                <Toolbar
                    variant="regular"
                    sx={(theme) => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                        borderRadius: '8px',
                        bgcolor: theme.palette.mode === 'light'
                            ? 'rgba(255, 255, 255, 0.4)'
                            : 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(10px)',
                        maxHeight: 40,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: `0 0 1px rgba(85, 166, 246, 0.1), 1px 1.5px 2px -1px rgba(85, 166, 246, 0.15), 4px 4px 12px -2.5px rgba(85, 166, 246, 0.15)`,
                    })}
                >
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', px: 0 }}>
                        <Logo />
                        <Link href='/' underline="none">
                            <Typography variant="h6" component="div" sx={{
                                ml: 2, fontWeight: 'bold', mr: 3,
                                color: (theme) => theme.palette.mode === 'light' ? 'primary.main' : 'primary.light',
                            }} >
                                PhyloTreeMiner
                            </Typography>
                        </Link>
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                underline="none"
                                color="textPrimary"
                                sx={{ ml: 2 }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </Box>
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
                        <Tooltip title="Projeto no GitHub">
                            <IconButton
                                color="primary"
                                href="https://github.com/"
                                target="_blank"
                            >
                                <GitHubIcon />
                            </IconButton>
                        </Tooltip>

                        <Button variant="contained" color="primary" onClick={handleStartWorking}>
                            Start working
                        </Button>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default AppAppBar;