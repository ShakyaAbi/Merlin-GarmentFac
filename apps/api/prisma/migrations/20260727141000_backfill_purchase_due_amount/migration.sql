UPDATE `Purchase`
SET `dueAmount` = `totalAmount`
WHERE `paidAmount` = 0 AND `dueAmount` = 0;
