import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Apply auth middleware to all diagram routes
router.use(authenticate);

// GET /api/diagrams — list user's diagrams
router.get('/', async (req, res) => {
  try {
    const diagrams = await prisma.diagram.findMany({
      where: {
        members: {
          some: { userId: req.user.userId },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(diagrams);
  } catch (error) {
    console.error('[/api/diagrams] Error fetching diagrams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/diagrams — create new diagram
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const diagram = await prisma.diagram.create({
      data: {
        name,
        canvasState: { objects: [] },
        members: {
          create: {
            userId: req.user.userId,
            role: 'owner'
          }
        }
      }
    });
    res.status(201).json(diagram);
  } catch (error) {
    console.error('[/api/diagrams] Error creating diagram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/diagrams/:id — get diagram with canvas state
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check access
    const membership = await prisma.diagramMember.findUnique({
      where: { userId_diagramId: { userId: req.user.userId, diagramId: id } }
    });
    
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const diagram = await prisma.diagram.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    });
    
    if (!diagram) return res.status(404).json({ error: 'Diagram not found' });
    
    res.json(diagram);
  } catch (error) {
    console.error('[/api/diagrams/:id] Error fetching diagram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/diagrams/:id — update canvas state (autosave)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { canvasState, name } = req.body;

    // Verify access
    const membership = await prisma.diagramMember.findUnique({
      where: { userId_diagramId: { userId: req.user.userId, diagramId: id } }
    });
    
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const updatedData = {};
    if (canvasState !== undefined) updatedData.canvasState = canvasState;
    if (name !== undefined) updatedData.name = name;

    const diagram = await prisma.diagram.update({
      where: { id },
      data: updatedData
    });

    res.json(diagram);
  } catch (error) {
    console.error('[/api/diagrams/:id] Error updating diagram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/diagrams/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify access and ownership
    const membership = await prisma.diagramMember.findUnique({
      where: { userId_diagramId: { userId: req.user.userId, diagramId: id } }
    });
    
    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can delete diagrams' });
    }

    await prisma.diagram.delete({ where: { id } });
    res.json({ message: 'Diagram deleted successfully' });
  } catch (error) {
    console.error('[/api/diagrams/:id] Error deleting diagram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/diagrams/:id/members — get collaborators
router.get('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const members = await prisma.diagramMember.findMany({
      where: { diagramId: id },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json(members);
  } catch (error) {
    console.error('[/api/diagrams/:id/members] Error fetching members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/diagrams/:id/members — invite by email
router.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    // Must be a member to invite
    const inviter = await prisma.diagramMember.findUnique({
      where: { userId_diagramId: { userId: req.user.userId, diagramId: id } }
    });
    
    if (!inviter) return res.status(403).json({ error: 'Access denied' });

    const userToInvite = await prisma.user.findUnique({ where: { email } });
    if (!userToInvite) return res.status(404).json({ error: 'User with this email not found' });

    const newMember = await prisma.diagramMember.create({
      data: {
        userId: userToInvite.id,
        diagramId: id,
        role: 'editor'
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    res.status(201).json(newMember);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'User is already a member' });
    }
    console.error('[/api/diagrams/:id/members] Error adding member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
