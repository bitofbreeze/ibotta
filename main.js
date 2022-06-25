import fetch from "node-fetch";
import { createClient } from "@urql/core";
import "isomorphic-unfetch";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.TOKEN;
const userId = process.env.USER_ID;
const retailerId = 42;

const client = createClient({
  url: "https://content-server.ibotta.com/graphql/",
  fetchOptions: () => {
    return {
      headers: { Authorization: token },
    };
  },
});

const AllOffers = `
query _(
	$availableBonuses_limit: Int
	$buyableGiftCards_limit: Int
	$buyableGiftCards_retailerId: Int
	$offerCategoriesContainer_limit: Int
	$offerCategoriesContainer_retailerId: Int
) {
	offerCategoriesContainer(
		retailerId: $offerCategoriesContainer_retailerId
		limit: $offerCategoriesContainer_limit
	) {
		containers {
			...Category_0
		}
	}
	buyableGiftCards(
		limit: $buyableGiftCards_limit
		retailerId: $buyableGiftCards_retailerId
	) {
		id
		__typename
		retailer_id
		cache_key
		gift_card_usage
		id
		is_gifting_primary
		max_purchase_amount
		min_purchase_amount
		name
		original_reward_percentage
		pwi_status
		retailer {
			...Retailer_0
		}
		retailerNode {
			...RetailerNode_0
		}
		retailer_id
		retailer_sku
		reward_percentage
		terms
		type
	}
	availableBonuses(limit: $availableBonuses_limit) {
		id
		__typename
		amount
		bonus_qualifications {
			...BonusQualification_0
		}
		bonus_type
		completed
		expiration
		id
		is_streak
		other_reward
		percent_complete
		uncompleted_image_url
	}
}
fragment Offer_0 on Offer {
	id
	__typename
	amount
	attribution_method
	bonuses
	flex_spend
	flex_spend_total
	id
	offer_type
	start_time
}
fragment Category_0 on Category {
	id
	__typename
	category_type
	content {
		...Offer_0
	}
	content_ids
	id
	name
}
fragment Retailer_0 on Retailer {
	id
	__typename
	favorite
	icon_url
	id
	model_c_retailer_image
	name
	nearby
	primary_category_id
	short_description
	verification_type
}
fragment RetailerCategoryNode_0 on RetailerCategoryNode {
	id
	__typename
	highlight
	id
	name
}
fragment RetailerNode_0 on RetailerNode {
	id
	__typename
	categories(
		filters: { categoryType: { type: NORMAL } }
		limit: { limit: 2, limitStrategy: All }
	) {
		...RetailerCategoryNode_0
	}
	displayType
}
fragment BonusQualification_0 on BonusQualification {
	id
	__typename
	completed
	progress_description
	progress_value
	required_value
}
`;

const main = async () => {
  const response = await client
    .query(AllOffers, {
      offerCategoriesContainer_retailerId: retailerId,
      buyableGiftCards_limit: 9000,
      offerCategoriesContainer_limit: 2147483647,
      buyableGiftCards_retailerId: retailerId,
      availableBonuses_limit: 1000,
    })
    .toPromise();

  const seen = new Set();

  await Promise.all(
    response.data.offerCategoriesContainer.containers.map(async (container) => {
      const content = [...container.content_ids];
      const responses = [];
      const intervalId = setInterval(async () => {
        if (!content.length) {
          clearInterval(intervalId);
          return;
        }
        const offer = content.pop();
        const offerId = offer.split(":")[1];
        console.log(`Adding ${offerId}`);
        if (!seen.has(offerId)) {
          const activateResponse = await fetch(
            `https://api.ibotta.com/v2/customers/${userId}/offers/${offerId}.json`,
            {
              body: JSON.stringify({
                activated: true,
              }),
              method: "PUT",
              headers: {
                Authorization: token,
                "Content-Type": "application/json",
              },
            }
          );
          responses.push(activateResponse);
          console.log(activateResponse.status);
          seen.add(offerId);
        }
      }, 300);
      return await Promise.all(responses);
    })
  );
};

main();
