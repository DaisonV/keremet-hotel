import { PrismaClient } from '@prisma/client';

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL;
const hotelId = process.env.HOTEL_ID;

if (!sourceUrl || !targetUrl || !hotelId) {
    console.error('SOURCE_DATABASE_URL, TARGET_DATABASE_URL and HOTEL_ID are required');
    process.exit(1);
}

const target = new URL(targetUrl);
if (!['localhost', '127.0.0.1'].includes(target.hostname)) {
    console.error(`Refusing to write to non-local target host: ${target.hostname}`);
    process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const local = new PrismaClient({ datasources: { db: { url: targetUrl } } });

const omit = (record, keys) => {
    const copy = { ...record };
    for (const key of keys) {
        delete copy[key];
    }
    return copy;
};

const main = async () => {
    const hotel = await source.hotel.findUnique({
        where: { id: hotelId }
    });

    if (!hotel) {
        throw new Error(`Source hotel not found: ${hotelId}`);
    }

    const hasSourceStayPaymentPermission = await source.$queryRaw`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'HotelAssignment'
              AND column_name = 'can_edit_stay_payments'
        ) AS "exists"
    `;
    const hasSourceMealPlan = await source.$queryRaw`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'RoomStay'
              AND column_name = 'meal_plan'
        ) AS "exists"
    `;

    const [
        rooms,
        stays,
        shifts,
        ledgerEntries,
        expenseCategories,
        bonusTiers,
        assignmentsRaw
    ] = await Promise.all([
        source.room.findMany({ where: { hotelId } }),
        hasSourceMealPlan[0]?.exists
            ? source.roomStay.findMany({ where: { hotelId } })
            : source.$queryRaw`
                SELECT
                    "id",
                    "roomId",
                    "hotelId",
                    "shiftId",
                    "guestName",
                    "guest_phone" AS "guestPhone",
                    "company_name" AS "companyName",
                    "booking_source" AS "bookingSource",
                    "scheduledCheckIn",
                    "scheduledCheckOut",
                    "actualCheckIn",
                    "actualCheckOut",
                    "status",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "amountPaid",
                    "paymentMethod",
                    "cashPaid",
                    "cardPaid",
                    "online_paid" AS "onlinePaid",
                    ARRAY[]::TEXT[] AS "mealPlan"
                FROM "RoomStay"
                WHERE "hotelId" = ${hotelId}
            `,
        source.shift.findMany({ where: { hotelId } }),
        source.cashEntry.findMany({ where: { hotelId } }),
        source.expenseCategory.findMany({ where: { hotelId } }),
        source.bonusTier.findMany({ where: { hotelId } }),
        hasSourceStayPaymentPermission[0]?.exists
            ? source.hotelAssignment.findMany({ where: { hotelId } })
            : source.$queryRaw`
                SELECT
                    "id",
                    "hotelId",
                    "userId",
                    "role",
                    "isActive",
                    "createdAt",
                    "updatedAt",
                    "pin_code" AS "pinCode",
                    "pin_hash" AS "pinHash",
                    "shift_pay_amount" AS "shiftPayAmount",
                    "revenue_share_pct" AS "revenueSharePct",
                    false AS "canEditStayPayments"
                FROM "HotelAssignment"
                WHERE "hotelId" = ${hotelId}
            `
    ]);
    const assignments = assignmentsRaw.map((assignment) => ({
        ...assignment,
        canEditStayPayments: Boolean(assignment.canEditStayPayments)
    }));

    const stayIds = stays.map((stay) => stay.id);
    const transfers = stayIds.length
        ? await source.stayTransfer.findMany({ where: { stayId: { in: stayIds } } })
        : [];

    const userIds = Array.from(new Set([
        ...assignments.map((assignment) => assignment.userId),
        ...shifts.map((shift) => shift.managerId),
        ...shifts.map((shift) => shift.handoverRecipientId).filter(Boolean),
        ...ledgerEntries.map((entry) => entry.managerId).filter(Boolean)
    ]));
    const users = userIds.length
        ? await source.user.findMany({ where: { id: { in: userIds } } })
        : [];

    await local.$transaction(async (tx) => {
        await tx.cashEntry.deleteMany({ where: { hotelId } });
        await tx.stayTransfer.deleteMany({ where: { stayId: { in: stayIds } } });
        await tx.room.updateMany({ where: { hotelId }, data: { currentStayId: null } });
        await tx.roomStay.deleteMany({ where: { hotelId } });
        await tx.shift.deleteMany({ where: { hotelId } });
        await tx.hotelAssignment.deleteMany({ where: { hotelId } });
        await tx.bonusTier.deleteMany({ where: { hotelId } });
        await tx.expenseCategory.deleteMany({ where: { hotelId } });
        await tx.room.deleteMany({ where: { hotelId } });
        await tx.hotel.deleteMany({ where: { id: hotelId } });

        for (const user of users) {
            await tx.user.upsert({
                where: { id: user.id },
                update: omit(user, ['id']),
                create: user
            });
        }

        await tx.hotel.create({ data: hotel });

        if (expenseCategories.length) {
            await tx.expenseCategory.createMany({ data: expenseCategories });
        }
        if (bonusTiers.length) {
            await tx.bonusTier.createMany({ data: bonusTiers });
        }
        if (rooms.length) {
            await tx.room.createMany({
                data: rooms.map((room) => ({ ...room, currentStayId: null }))
            });
        }
        if (shifts.length) {
            await tx.shift.createMany({ data: shifts });
        }
        if (stays.length) {
            await tx.roomStay.createMany({ data: stays });
        }
        if (transfers.length) {
            await tx.stayTransfer.createMany({ data: transfers });
        }
        if (ledgerEntries.length) {
            await tx.cashEntry.createMany({ data: ledgerEntries });
        }
        if (assignments.length) {
            await tx.hotelAssignment.createMany({ data: assignments });
        }

        for (const room of rooms) {
            if (room.currentStayId) {
                await tx.room.update({
                    where: { id: room.id },
                    data: { currentStayId: room.currentStayId }
                });
            }
        }
    }, { timeout: 120000 });

    console.log(JSON.stringify({
        hotel: hotel.name,
        hotelId,
        rooms: rooms.length,
        stays: stays.length,
        shifts: shifts.length,
        ledgerEntries: ledgerEntries.length,
        users: users.length,
        assignments: assignments.length
    }, null, 2));
};

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await source.$disconnect();
        await local.$disconnect();
    });
