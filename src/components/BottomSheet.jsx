import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Box, IconButton, Typography, useTheme, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Close, Save, Delete, CameraAlt } from '@mui/icons-material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const COLLAPSED_HEIGHT = '14vh';

const BottomSheet = forwardRef(({
    isOpen,
    onClose,
    waypointName,
    onSave,
    onDelete,
    onImageUpload,
    imageUploading,
    canSave = true,
    children,
    onExpansionChange,
}, ref) => {
    const theme = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    const [calculatedHeight, setCalculatedHeight] = useState('auto');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const containerRef = useRef(null);
    const contentRef = useRef(null);

    // Expose collapse method to parent via ref
    useImperativeHandle(ref, () => ({
        collapse: () => {
            setIsExpanded(false);
        },
        expand: () => {
            setIsExpanded(true);
        },
        toggle: () => {
            setIsExpanded(prev => !prev);
        },
    }));

    // Calculate height only when expansion state changes
    useEffect(() => {
        if (isExpanded && contentRef.current) {
            const height = Math.min(contentRef.current.scrollHeight + 60, window.innerHeight * 0.88);
            setCalculatedHeight(`${height}px`);
        }
    }, [isExpanded]);

    // Notify parent when expansion state changes
    useEffect(() => {
        if (onExpansionChange) {
            onExpansionChange(isExpanded);
        }
    }, [isExpanded, onExpansionChange]);

    // Reset to collapsed when opened
    useEffect(() => {
        if (isOpen) {
            setIsExpanded(false);
            setCalculatedHeight('auto');
        }
    }, [isOpen]);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        setDeleteDialogOpen(false);
        if (onDelete) {
            onDelete();
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
    };

    if (!isOpen) return null;

    return (
        <>
            <motion.div
                ref={containerRef}
                animate={{
                    height: isExpanded ? calculatedHeight : COLLAPSED_HEIGHT,
                }}
                initial={{
                    height: COLLAPSED_HEIGHT,
                }}
                transition={{
                    type: 'spring',
                    damping: 30,
                    stiffness: 300,
                }}
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: theme.palette.background.paper,
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    boxShadow: theme.palette.mode === 'dark'
                        ? '0 -4px 20px rgba(0, 0, 0, 0.5)'
                        : '0 -4px 20px rgba(0, 0, 0, 0.15)',
                    zIndex: theme.zIndex.drawer + 5,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Toggle Icon - Always visible, clickable in both states */}
                <Box
                    onClick={handleToggleExpand}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        py: 0.5,
                        cursor: 'pointer',
                        flexShrink: 0,
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.2s',
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                        },
                        '&:active': {
                            backgroundColor: theme.palette.action.selected,
                        },
                    }}
                >
                    <IconButton
                        size="small"
                        sx={{
                            color: theme.palette.text.secondary,
                            pointerEvents: 'none', // Let parent Box handle clicks
                        }}
                    >
                        {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
                    </IconButton>
                </Box>

                {/* Collapsed State UI */}
                {!isExpanded && (
                    <Box
                        sx={{
                            px: 2,
                            pb: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            flexShrink: 0,
                        }}
                    >
                        {/* Top row: Waypoint Name and Close button */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                            }}
                        >
                            {/* Waypoint Name - Clickable to expand */}
                            <Typography
                                onClick={handleToggleExpand}
                                sx={{
                                    flex: 1,
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    color: theme.palette.text.primary,
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    '&:hover': {
                                        color: theme.palette.primary.main,
                                    },
                                }}
                            >
                                {waypointName || 'Waypoint'}
                            </Typography>

                            {/* Close button */}
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                sx={{
                                    color: theme.palette.text.secondary,
                                    width: '2rem',
                                    height: '2rem',
                                    '& .MuiSvgIcon-root': { fontSize: '1.4rem' },
                                }}
                                title="Close"
                            >
                                <Close />
                            </IconButton>
                        </Box>

                        {/* Bottom row: Action chips */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {/* Save chip - primary theme color */}
                            <Chip
                                icon={<Save sx={{ fontSize: '1.1rem !important' }} />}
                                label="Save"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (canSave) onSave();
                                }}
                                disabled={!canSave}
                                color="primary"
                                sx={{
                                    px: 0.5,
                                    py: 1.75,
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    cursor: canSave ? 'pointer' : 'not-allowed',
                                    '& .MuiChip-label': {
                                        px: 1,
                                    },
                                    '&:hover': canSave ? {
                                        transform: 'translateY(-1px)',
                                        boxShadow: `0 2px 8px ${theme.palette.primary.main}30`,
                                    } : {},
                                    transition: 'all 0.2s',
                                }}
                            />

                            {/* Capture chip - primary theme color */}
                            <Chip
                                icon={<CameraAlt sx={{ fontSize: '1.1rem !important' }} />}
                                label={
                                    <Box component="label" sx={{ cursor: imageUploading ? 'not-allowed' : 'pointer' }}>
                                        Capture
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/*"
                                            capture="environment"
                                            onChange={onImageUpload}
                                            disabled={imageUploading}
                                        />
                                    </Box>
                                }
                                disabled={imageUploading}
                                color="primary"
                                sx={{
                                    px: 0.5,
                                    py: 1.75,
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    '& .MuiChip-label': {
                                        px: 1,
                                    },
                                    '&:hover': !imageUploading ? {
                                        transform: 'translateY(-1px)',
                                        boxShadow: `0 2px 8px ${theme.palette.primary.main}30`,
                                    } : {},
                                    transition: 'all 0.2s',
                                }}
                            />

                            {/* Delete chip - greyish */}
                            <Chip
                                icon={<Delete sx={{ fontSize: '1.1rem !important' }} />}
                                label="Delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick();
                                }}
                                color="default"
                                sx={{
                                    px: 0.5,
                                    py: 1.75,
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#E0E0E0',
                                    color: theme.palette.text.primary,
                                    '& .MuiChip-label': {
                                        px: 1,
                                    },
                                    '&:hover': {
                                        backgroundColor: theme.palette.mode === 'dark' ? '#616161' : '#BDBDBD',
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                    },
                                    transition: 'all 0.2s',
                                }}
                            />
                        </Box>
                    </Box>
                )}

                {/* Expanded State - Full Content */}
                {isExpanded && (
                    <Box
                        ref={contentRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: 'hidden',
                        }}
                    >
                        {children}
                    </Box>
                )}
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleDeleteConfirm();
                    } else if (e.key === 'Escape') {
                        handleDeleteCancel();
                    }
                }}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600 }}>
                    Delete Waypoint
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this waypoint? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={handleDeleteCancel}
                        variant="text"
                        sx={{ textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        variant="contained"
                        color="error"
                        sx={{ textTransform: 'none', boxShadow: 1 }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
});

BottomSheet.displayName = 'BottomSheet';

export default BottomSheet;
