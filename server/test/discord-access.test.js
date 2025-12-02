/**
 * Discord Role-Based Access Control Tests
 * Tests access control logic based on Discord roles and time restrictions
 */

describe("Discord Role-Based Access Control", () => {
  const DAYS_OF_WEEK = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  /**
   * Mock access control function (simulates server logic)
   */
  function checkAccess(userRoles, currentDay, currentHour, accessRoles) {
    const openRoles = accessRoles.filter((role) => {
      // Check day restriction
      if (role.daysOfWeek !== "anytime" && !role.daysOfWeek.includes(currentDay)) {
        return false;
      }

      // Check time restriction
      if (role.timeRange === "anytime") {
        return true;
      }

      const [startHour, endHour] = role.timeRange.split("-").map(Number);
      return currentHour >= startHour && currentHour <= endHour;
    });

    // Check if user has any of the open roles
    for (const role of openRoles) {
      if (userRoles.includes(role.roleId)) {
        return { granted: true, role: role.name, reason: `Has role: ${role.name}` };
      }
    }

    if (userRoles.length === 0) {
      return { granted: false, reason: "No roles assigned" };
    }

    return { granted: false, reason: "Roles not valid at this time" };
  }

  describe("Member with Valid Role", () => {
    test("should grant access during allowed hours", () => {
      const userRoles = ["member_role_id"];
      const accessRoles = [
        {
          roleId: "member_role_id",
          name: "Member",
          daysOfWeek: "anytime",
          timeRange: "8-20",
        },
      ];

      const result = checkAccess(userRoles, "Monday", 10, accessRoles);

      expect(result.granted).toBe(true);
      expect(result.role).toBe("Member");
    });

    test("should deny access outside allowed hours", () => {
      const userRoles = ["member_role_id"];
      const accessRoles = [
        {
          roleId: "member_role_id",
          name: "Member",
          daysOfWeek: "anytime",
          timeRange: "8-20",
        },
      ];

      const result = checkAccess(userRoles, "Monday", 22, accessRoles);

      expect(result.granted).toBe(false);
      expect(result.reason).toBe("Roles not valid at this time");
    });
  });

  describe("Building Manager (24/7 Access)", () => {
    test("should grant access at any time", () => {
      const userRoles = ["manager_role_id"];
      const accessRoles = [
        {
          roleId: "manager_role_id",
          name: "Building Manager",
          daysOfWeek: "anytime",
          timeRange: "anytime",
        },
      ];

      // Test different times
      const times = [2, 10, 15, 22];
      times.forEach((hour) => {
        const result = checkAccess(userRoles, "Monday", hour, accessRoles);
        expect(result.granted).toBe(true);
        expect(result.role).toBe("Building Manager");
      });
    });

    test("should grant access on any day", () => {
      const userRoles = ["manager_role_id"];
      const accessRoles = [
        {
          roleId: "manager_role_id",
          name: "Building Manager",
          daysOfWeek: "anytime",
          timeRange: "anytime",
        },
      ];

      // Test all days of the week
      DAYS_OF_WEEK.forEach((day) => {
        const result = checkAccess(userRoles, day, 14, accessRoles);
        expect(result.granted).toBe(true);
      });
    });
  });

  describe("Day-Restricted Access", () => {
    test("should grant access on allowed days only", () => {
      const userRoles = ["weekday_role_id"];
      const accessRoles = [
        {
          roleId: "weekday_role_id",
          name: "Weekday Member",
          daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          timeRange: "anytime",
        },
      ];

      // Allowed days
      const result1 = checkAccess(userRoles, "Monday", 14, accessRoles);
      expect(result1.granted).toBe(true);

      const result2 = checkAccess(userRoles, "Friday", 14, accessRoles);
      expect(result2.granted).toBe(true);

      // Denied days
      const result3 = checkAccess(userRoles, "Saturday", 14, accessRoles);
      expect(result3.granted).toBe(false);

      const result4 = checkAccess(userRoles, "Sunday", 14, accessRoles);
      expect(result4.granted).toBe(false);
    });
  });

  describe("Combined Time and Day Restrictions", () => {
    test("should grant access only on Tuesday evenings", () => {
      const userRoles = ["tuesday_evening_role_id"];
      const accessRoles = [
        {
          roleId: "tuesday_evening_role_id",
          name: "Tuesday Evening",
          daysOfWeek: ["Tuesday"],
          timeRange: "18-23",
        },
      ];

      // Correct day and time
      const result1 = checkAccess(userRoles, "Tuesday", 19, accessRoles);
      expect(result1.granted).toBe(true);

      // Correct day, wrong time
      const result2 = checkAccess(userRoles, "Tuesday", 10, accessRoles);
      expect(result2.granted).toBe(false);

      // Wrong day, correct time
      const result3 = checkAccess(userRoles, "Wednesday", 19, accessRoles);
      expect(result3.granted).toBe(false);

      // Wrong day and time
      const result4 = checkAccess(userRoles, "Monday", 10, accessRoles);
      expect(result4.granted).toBe(false);
    });
  });

  describe("User with No Roles", () => {
    test("should deny access", () => {
      const userRoles = [];
      const accessRoles = [
        {
          roleId: "member_role_id",
          name: "Member",
          daysOfWeek: "anytime",
          timeRange: "anytime",
        },
      ];

      const result = checkAccess(userRoles, "Monday", 14, accessRoles);

      expect(result.granted).toBe(false);
      expect(result.reason).toBe("No roles assigned");
    });
  });

  describe("User with Invalid Role", () => {
    test("should deny access if role not in access_roles.json", () => {
      const userRoles = ["invalid_role_id"];
      const accessRoles = [
        {
          roleId: "member_role_id",
          name: "Member",
          daysOfWeek: "anytime",
          timeRange: "anytime",
        },
      ];

      const result = checkAccess(userRoles, "Monday", 14, accessRoles);

      expect(result.granted).toBe(false);
      expect(result.reason).toBe("Roles not valid at this time");
    });
  });

  describe("Multiple Roles", () => {
    test("should grant access if any role is valid", () => {
      const userRoles = ["restricted_role_id", "anytime_role_id"];
      const accessRoles = [
        {
          roleId: "restricted_role_id",
          name: "Restricted",
          daysOfWeek: "anytime",
          timeRange: "9-17", // 9am-5pm only
        },
        {
          roleId: "anytime_role_id",
          name: "Anytime",
          daysOfWeek: "anytime",
          timeRange: "anytime",
        },
      ];

      // Even outside restricted role hours, anytime role grants access
      const result = checkAccess(userRoles, "Monday", 22, accessRoles);

      expect(result.granted).toBe(true);
      // Anytime role is valid, so it should match (order depends on which role is checked first)
      expect(["Restricted", "Anytime"]).toContain(result.role);
    });
  });

  describe("Time Range Boundary Testing", () => {
    test("should grant access at start hour", () => {
      const userRoles = ["member_role_id"];
      const accessRoles = [
        {
          roleId: "member_role_id",
          name: "Member",
          daysOfWeek: "anytime",
          timeRange: "9-17",
        },
      ];

      const result = checkAccess(userRoles, "Monday", 9, accessRoles);
      expect(result.granted).toBe(true);
    });

    test("should grant access at end hour", () => {
      const userRoles = ["member_role_id"];
      const accessRoles = [
        {
          roleId: "member_role_id",
          name: "Member",
          daysOfWeek: "anytime",
          timeRange: "9-17",
        },
      ];

      const result = checkAccess(userRoles, "Monday", 17, accessRoles);
      expect(result.granted).toBe(true);
    });

    test("should deny access one hour before start", () => {
      const userRoles = ["member_role_id"];
      const accessRoles = [
        {
          roleId: "member_role_id",
          name: "Member",
          daysOfWeek: "anytime",
          timeRange: "9-17",
        },
      ];

      const result = checkAccess(userRoles, "Monday", 8, accessRoles);
      expect(result.granted).toBe(false);
    });

    test("should deny access one hour after end", () => {
      const userRoles = ["member_role_id"];
      const accessRoles = [
        {
          roleId: "member_role_id",
          name: "Member",
          daysOfWeek: "anytime",
          timeRange: "9-17",
        },
      ];

      const result = checkAccess(userRoles, "Monday", 18, accessRoles);
      expect(result.granted).toBe(false);
    });
  });
});
