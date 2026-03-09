const prisma = require('../../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const sendInvitation = async (email, role, organizationId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const invitation = await prisma.invitationToken.create({
    data: {
      email,
      role,
      organizationId,
      token,
      expiresAt
    }
  });

  // In a real app, send email here. For now, we'll return the setup link.
  const setupLink = `http://localhost:5173/setup-password?token=${token}`;
  
  return { invitation, setupLink };
};

const completeInvitation = async (token, password) => {
  const invitation = await prisma.invitationToken.findUnique({
    where: { token }
  });

  if (!invitation || invitation.expiresAt < new Date()) {
    throw new Error('Invalid or expired invitation token');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const updatedEmployee = await prisma.employee.update({
    where: { email: invitation.email },
    data: {
      status: 'ACTIVE',
      user: {
        upsert: {
          create: {
            email: invitation.email,
            password: hashedPassword,
            role: invitation.role
          },
          update: {
            password: hashedPassword,
            role: invitation.role
          }
        }
      }
    }
  });

  // Delete the token after use
  await prisma.invitationToken.delete({ where: { id: invitation.id } });

  return updatedEmployee;
};

module.exports = {
  sendInvitation,
  completeInvitation
};
