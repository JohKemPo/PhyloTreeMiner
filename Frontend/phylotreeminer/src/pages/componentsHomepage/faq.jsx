
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';


const FAQ = () => (
    <Container id="faq" sx={{ py: { xs: 8, sm: 16 } }}>
        <Typography component="h2" variant="h4" color="text.primary" align="center" sx={{ mb: { xs: 4, sm: 8 } }}>
            Frequently Asked Questions
        </Typography>
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Who is  for?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography >
                         is designed for both experienced bioinformatics researchers and students and scientists new to phylogenetic analysis. Its intuitive interface and preconfigured workflows make it easy for beginners to use, while advanced customization options meet the needs of experts.
                    </Typography>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography >Do I need to know how to program to use the tool?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography >
                        No! One of our main goals is to simplify access to complex analyses. You can execute complete workflows through our graphical interface, without writing a single line of code.
                    </Typography>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography >What input data types are supported?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography >
                        The platform currently supports DNA, RNA, and protein sequences in FASTA format. We're working to expand support to other formats popular in the scientific community.
                    </Typography>
                </AccordionDetails>
            </Accordion>
        </Box>
    </Container>
);

export default FAQ;