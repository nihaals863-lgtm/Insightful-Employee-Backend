const employeesService = require('./employees.service');
const invitationService = require('../auth/invitation.service');
const { inviteEmployeeSchema, updateEmployeeSchema } = require('./employees.validation');
const { getOrganizationId } = require('../../utils/orgId');

const getEmployees = async (req, res, next) => {
    try {
        const orgId = await getOrganizationId(req);
        const { role, employeeId: currentEmployeeId } = req.user;

        let filter = {};
        if (role === 'MANAGER') {
            // Get manager's teamId
            const manager = await employeesService.getEmployeeById(currentEmployeeId);
            if (manager && manager.teamId) {
                filter.teamId = manager.teamId;
            } else {
                return res.status(200).json({ success: true, data: [] });
            }
        } else if (role === 'EMPLOYEE') {
            filter.id = currentEmployeeId;
        }

        const employees = await employeesService.getEmployees(orgId, filter);

        // Map to industry/insightful format
        const formattedEmployees = employees.map(emp => ({
            id: emp.id,
            name: emp.fullName, // Map fullName to name for frontend compatibility
            email: emp.email,
            team: emp.team ? emp.team.name : 'Unassigned',
            location: emp.location,
            status: emp.status.toLowerCase(),
            avatar: emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=random`,
            role: emp.role,
            organizationId: emp.organizationId,
            teamId: emp.teamId,
            computerType: emp.computerType,
            hourlyRate: emp.hourlyRate
        }));

        res.status(200).json({
            success: true,
            data: formattedEmployees
        });
    } catch (error) {
        next(error);
    }
};

const getEmployeeById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const employee = await employeesService.getEmployeeById(id);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        const formattedEmployee = {
            ...employee,
            name: employee.fullName,
            team: employee.team ? employee.team.name : 'Unassigned',
            status: employee.status.toLowerCase()
        };

        res.status(200).json({
            success: true,
            data: formattedEmployee
        });
    } catch (error) {
        next(error);
    }
};

const inviteEmployee = async (req, res, next) => {
    try {
        if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        const validatedData = inviteEmployeeSchema.parse(req.body);
        
        // 1. Create employee in DB (status: INVITED)
        const employee = await employeesService.inviteEmployee(validatedData);
        
        // 2. Generate invitation token and link
        const { setupLink } = await invitationService.sendInvitation(
            validatedData.email, 
            'EMPLOYEE', // or validatedData.role if added to schema
            validatedData.organizationId
        );

        res.status(201).json({
            success: true,
            message: "Employee invited successfully",
            data: employee,
            setupLink: setupLink // Returning the link for testing
        });
    } catch (error) {
        next(error);
    }
};

const updateEmployee = async (req, res, next) => {
    try {
        if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
            return res.status(403).json({ success: false, message: "Only admins and managers can update employees" });
        }
        const { id } = req.params;
        const validatedData = updateEmployeeSchema.parse(req.body);
        const employee = await employeesService.updateEmployee(id, validatedData);
        
        // Map to industry/insightful format for frontend consistency
        const formattedEmployee = {
            ...employee,
            name: employee.fullName,
            status: employee.status.toLowerCase(),
            avatar: employee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.fullName)}&background=random`
        };

        res.status(200).json({
            success: true,
            message: "Employee updated successfully",
            data: formattedEmployee
        });
    } catch (error) {
        next(error);
    }
};

const deleteEmployee = async (req, res, next) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: "Only admins can delete employees" });
        }
        const { id } = req.params;
        await employeesService.deleteEmployee(id);
        res.status(200).json({
            success: true,
            message: "Employee deleted successfully (deactivated)"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEmployees,
    getEmployeeById,
    inviteEmployee,
    updateEmployee,
    deleteEmployee
};
