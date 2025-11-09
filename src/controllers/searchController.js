import PTProfile from "../models/PTProfile.js";
import User from "../models/User.js";
import Package from "../models/Package.js";

/* ----------------------------------------------------
   🔹 Search PT by specialty, slot availability, package duration, area, mode, and location
---------------------------------------------------- */
export const getPTsByAvailableSlot = async (req, res) => {
  try {
    const {
      availableAt, // F4.3 – filter by PT slot availability
      specialty, // F4.1 – filter by specialty / goal
      packageTime, // F4.1 extended – filter by package duration
      area, // filter by PT working area
      coords, // coordinates from current location ("lat, lon")
      modes, // optional mode filter
      sortBy = "best",
      page = 1,
      limit = 12,
    } = req.query;

    const pipeline = [];

    // ✅ 1. Only verified PTs available for new clients
    pipeline.push({
      $match: { verified: true, availableForNewClients: true },
    });

    // ✅ 2. Require at least one of area or coords
    if (!area && !coords) {
      return res.status(400).json({
        success: false,
        message: "Either area or coordinates is required to search PTs.",
      });
    }

    /* ----------------------------------------------------
   ✅ 3. AREA or COORDS FILTER (accent-insensitive + GPS-aware)
---------------------------------------------------- */
if (area) {
  // --- Lọc theo thành phố (nếu user chọn thủ công)
  const normalizedArea = area
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(tp\.?|thanh pho|city|province)/gi, "")
    .trim();

  const areaAliases = {
    "ho chi minh": [
      "hcm", "tp hcm", "tp.hcm", "tphcm", "sai gon", "saigon",
      "thanh pho ho chi minh", "tp ho chi minh",
      "ho chi minh", "thành phố hồ chí minh", "tp hồ chí minh",
      "quan", "quận", "district"
    ],
    "ha noi": ["hn", "ha noi", "hanoi", "thanh pho ha noi", "hà nội", "quan", "quận", "district"],
    "da nang": ["dn", "da nang", "danang", "đà nẵng", "hai chau", "son tra", "thanh khe"]
  };

  let aliases = [];
  for (const [key, vals] of Object.entries(areaAliases)) {
    if (normalizedArea.includes(key)) {
      aliases = vals;
      break;
    }
  }

  const regexList = [
    new RegExp(normalizedArea.replace(/\s+/g, ".*"), "i"),
    ...aliases.map(a => new RegExp(a.replace(/\s+/g, ".*"), "i"))
  ];
  const districtPattern = /(quan|quận|district)\s*\d+/i;

  pipeline.push({
    $match: {
      $or: [
        { gymLocation: { $in: regexList } },
        { areaNote: { $in: regexList } },
        { "primaryGym.address": { $in: regexList } },
        { gymLocation: { $regex: districtPattern } },
        { areaNote: { $regex: districtPattern } },
        { "primaryGym.address": { $regex: districtPattern } }
      ]
    }
  });

} else if (coords) {
  // --- Nếu có toạ độ thì gọi API để suy ra thành phố
  const [lat, lon] = coords.split(',').map(Number);
  if (!isNaN(lat) && !isNaN(lon)) {
    try {
      const fetch = (await import("node-fetch")).default;
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=en`;
      const res = await fetch(url);
      const data = await res.json();
      const addr = data?.address || {};
      const detectedCity = addr.city || addr.town || addr.state || "";

      if (detectedCity) {
        const regex = new RegExp(detectedCity, "i");
        pipeline.push({
          $match: {
            $or: [
              { gymLocation: regex },
              { areaNote: regex },
              { "primaryGym.address": regex }
            ]
          }
        });
      }
    } catch (err) {
      console.warn("Reverse geocode failed:", err.message);
    }
  }
}

    /* ----------------------------------------------------
       ✅ 4. COORDINATES FILTER (only if no area)
    ---------------------------------------------------- */
    if (!area && coords) {
      const [lat, lon] = coords.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lon)) {
        pipeline.push({
          $addFields: {
            distanceKm: { $literal: 0 }, // Placeholder (could use $geoNear in future)
          },
        });
      }
    }

    /* ----------------------------------------------------
   ✅ 5. Filter by delivery modes (optional) – skip if PTs don't have this field
---------------------------------------------------- */
if (modes && Array.isArray(modes) && modes.length > 0) {
  const selectedModes = modes.map((m) => m.trim());
  pipeline.push({
    $match: {
      $or: [
        // ✅ Nếu PT có các mode này thì match
        ...selectedModes.map((mode) => ({
          [`deliveryModes.${mode}`]: true,
        })),
        // ✅ Nếu PT chưa có field deliveryModes thì vẫn cho qua
        { deliveryModes: { $exists: false } },
      ],
    },
  });
}

    /* ----------------------------------------------------
       ✅ 6. Filter by specialty
    ---------------------------------------------------- */
    if (specialty) {
      pipeline.push({
        $match: { specialties: { $regex: new RegExp(specialty, "i") } },
      });
    }

    /* ----------------------------------------------------
       ✅ 7. Filter by available slot
    ---------------------------------------------------- */
    if (availableAt) {
      const time = new Date(availableAt);
      pipeline.push({
        $lookup: {
          from: "slots",
          let: { ptId: "$user" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$pt", "$$ptId"] },
                    { $eq: ["$status", "OPEN"] },
                    { $lte: ["$startTime", time] },
                    { $gt: ["$endTime", time] },
                  ],
                },
              },
            },
          ],
          as: "openSlotsAt",
        },
      });
      pipeline.push({ $match: { "openSlotsAt.0": { $exists: true } } });
    }

    /* ----------------------------------------------------
       ✅ 8. Lookup packages (and filter by duration)
    ---------------------------------------------------- */
    pipeline.push({
      $lookup: {
        from: "packages",
        let: { ptId: "$user" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$pt", "$$ptId"] },
              isActive: true,
              ...(packageTime && {
                durationDays:
                  packageTime === "short"
                    ? { $lt: 7 }
                    : packageTime === "medium"
                    ? { $gte: 7, $lte: 30 }
                    : packageTime === "long"
                    ? { $gt: 30 }
                    : {},
              }),
            },
          },
          { $sort: { price: 1 } },
          {
            $project: {
              name: 1,
              price: 1,
              durationDays: 1,
              description: 1,
              tags: 1,
            },
          },
        ],
        as: "packages",
      },
    });

    /* ----------------------------------------------------
       ✅ 9. Match specialty in package tags too
    ---------------------------------------------------- */
    if (specialty) {
      pipeline.push({
        $match: {
          $or: [
            { specialties: { $regex: new RegExp(specialty, "i") } },
            { "packages.tags": { $regex: new RegExp(specialty, "i") } },
          ],
        },
      });
    }

    /* ----------------------------------------------------
       ✅ 10. Featured package & lowest price
    ---------------------------------------------------- */
    pipeline.push({
      $addFields: {
        featuredPackage: { $arrayElemAt: ["$packages", 0] },
        lowestPricePerSession: { $min: "$packages.price" },
      },
    });

    /* ----------------------------------------------------
       ✅ 11. Join user info
    ---------------------------------------------------- */
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userInfo",
      },
    });
    pipeline.push({
      $addFields: {
        userInfo: { $arrayElemAt: ["$userInfo", 0] },
      },
    });

    /* ----------------------------------------------------
       ✅ 12. Sorting logic
    ---------------------------------------------------- */
    const sort = {};
    switch (sortBy) {
      case "price":
        sort.lowestPricePerSession = 1;
        break;
      case "rating":
        sort.ratingAvg = -1;
        break;
      case "distance":
        sort.distanceKm = 1;
        break;
      default:
        sort.ratingAvg = -1;
        sort.lowestPricePerSession = 1;
        break;
    }
    pipeline.push({ $sort: sort });

    /* ----------------------------------------------------
       ✅ 13. Pagination
    ---------------------------------------------------- */
    pipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    );

    /* ----------------------------------------------------
       ✅ 14. Execute
    ---------------------------------------------------- */
    const result = await PTProfile.aggregate(pipeline);

    res.status(200).json({
      success: true,
      message: "Search PTs successful",
      page: Number(page),
      limit: Number(limit),
      total: result.length,
      items: result,
    });
  } catch (error) {
    console.error("Error searching PTs:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ----------------------------------------------------
   🔹 PT Detail (includes all active packages)
---------------------------------------------------- */
export const getPTById = async (req, res) => {
  try {
    const ptProfile = await PTProfile.findById(req.params.id).lean();
    if (!ptProfile) {
      return res
        .status(404)
        .json({ success: false, message: "PT not found" });
    }

    const user = await User.findById(ptProfile.user)
      .select("name avatar gender email phone")
      .lean();

    const packages = await Package.find({
      pt: ptProfile.user,
      isActive: true,
    })
      .select("name price durationDays description tags")
      .lean();

    res.status(200).json({
      success: true,
      message: "PT detail retrieved successfully",
      data: { ...ptProfile, user, packages },
    });
  } catch (error) {
    console.error("Error fetching PT detail:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
